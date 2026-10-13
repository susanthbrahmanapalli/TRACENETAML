"""
Graph Intelligence Engine powered by NetworkX
Maintains an in-memory directed transaction graph for fast topological queries:
- Bounded k-hop ego networks
- Elementary cycle detection for layering schemes
- Fan-in and Fan-out topological analysis
- Time-aware rapid onward flow analysis
"""
from datetime import datetime, timedelta, timezone
import networkx as nx
from sqlalchemy.orm import Session
from src.backend.models import Transaction, Account
from src.backend.schemas import GraphNode, GraphEdge, CyclePath, GraphNetworkResponse
from src.backend.config import settings

class GraphIntelligenceEngine:
    def __init__(self):
        # Directed multigraph for transactions
        self.graph = nx.MultiDiGraph()
        self.account_metadata: dict[str, dict] = {}

    def load_from_db(self, db: Session):
        """Populate graph from existing database records."""
        self.graph.clear()
        self.account_metadata.clear()
        
        accounts = db.query(Account).all()
        for acc in accounts:
            self.account_metadata[acc.account_id] = {
                "name": acc.account_name,
                "account_type": acc.account_type,
                "risk_score": acc.risk_score,
                "is_flagged": acc.is_flagged
            }
            self.graph.add_node(
                acc.account_id,
                name=acc.account_name,
                account_type=acc.account_type,
                risk_score=acc.risk_score,
                is_flagged=acc.is_flagged
            )

        transactions = db.query(Transaction).filter(Transaction.status == "COMPLETED").all()
        for txn in transactions:
            self.add_transaction(txn)

    def add_transaction(self, txn: Transaction):
        """Add a transaction edge dynamically."""
        sender = txn.sender_account_id
        receiver = txn.receiver_account_id
        
        if not self.graph.has_node(sender):
            self.graph.add_node(sender, name=sender, account_type="SAVINGS", risk_score=10.0, is_flagged=False)
        if not self.graph.has_node(receiver):
            self.graph.add_node(receiver, name=receiver, account_type="SAVINGS", risk_score=10.0, is_flagged=False)

        # Store edge with transaction attributes
        self.graph.add_edge(
            sender,
            receiver,
            key=txn.transaction_id,
            transaction_id=txn.transaction_id,
            amount=txn.amount,
            currency=txn.currency,
            channel=txn.channel,
            timestamp=txn.timestamp
        )

    def get_network(self, focal_account_id: str | None = None, depth: int = 2, max_nodes: int = 60) -> GraphNetworkResponse:
        """
        Extract bounded network. If focal_account_id is provided, extracts k-hop ego network.
        Otherwise, returns high-risk subgraph.
        """
        depth = min(depth, settings.MAX_GRAPH_HOP_DEPTH)
        max_nodes = min(max_nodes, settings.MAX_NEIGHBORHOOD_NODES)
        
        if focal_account_id and self.graph.has_node(focal_account_id):
            sub_nodes = {focal_account_id}
            current_frontier = {focal_account_id}
            
            for _ in range(depth):
                next_frontier = set()
                for node in current_frontier:
                    # In-neighbors and Out-neighbors
                    neighbors = set(self.graph.predecessors(node)) | set(self.graph.successors(node))
                    next_frontier.update(neighbors)
                sub_nodes.update(next_frontier)
                if len(sub_nodes) >= max_nodes:
                    break
            selected_nodes = list(sub_nodes)[:max_nodes]
            subgraph = self.graph.subgraph(selected_nodes)
        else:
            # Pick accounts with highest degree or risk score
            if len(self.graph.nodes) > 0:
                ranked = sorted(
                    self.graph.nodes,
                    key=lambda n: (self.graph.degree(n), self.account_metadata.get(n, {}).get("risk_score", 0)),
                    reverse=True
                )
                selected_nodes = ranked[:max_nodes]
                subgraph = self.graph.subgraph(selected_nodes)
            else:
                return GraphNetworkResponse(focal_account_id=focal_account_id, nodes=[], edges=[], total_nodes=0, total_edges=0)

        # Detect cycles in this induced subgraph
        cycles = self.detect_subgraph_cycles(subgraph)
        cycle_edges_set = set()
        for c in cycles:
            for tid in c.transaction_ids:
                cycle_edges_set.add(tid)

        # Build response nodes
        response_nodes = []
        for n in subgraph.nodes:
            meta = self.account_metadata.get(n, {})
            # Calculate inflow / outflow
            in_edges = self.graph.in_edges(n, data=True)
            out_edges = self.graph.out_edges(n, data=True)
            inflow = sum(data.get("amount", 0.0) for _, _, data in in_edges)
            outflow = sum(data.get("amount", 0.0) for _, _, data in out_edges)
            
            response_nodes.append(GraphNode(
                id=n,
                label=meta.get("name", n),
                account_type=meta.get("account_type", "SAVINGS"),
                risk_score=meta.get("risk_score", 10.0),
                total_inflow=round(inflow, 2),
                total_outflow=round(outflow, 2),
                degree=self.graph.degree(n),
                is_focal=(n == focal_account_id),
                is_flagged=meta.get("is_flagged", False)
            ))

        # Build response edges
        response_edges = []
        for u, v, key, data in subgraph.edges(keys=True, data=True):
            tid = data.get("transaction_id", str(key))
            response_edges.append(GraphEdge(
                id=f"{u}-{v}-{tid}",
                source=u,
                target=v,
                amount=data.get("amount", 0.0),
                currency=data.get("currency", "INR"),
                channel=data.get("channel", "UPI"),
                timestamp=data.get("timestamp", datetime.now(timezone.utc)),
                transaction_id=tid,
                is_part_of_cycle=(tid in cycle_edges_set)
            ))

        return GraphNetworkResponse(
            focal_account_id=focal_account_id,
            nodes=response_nodes,
            edges=response_edges,
            detected_cycles=cycles,
            total_nodes=len(response_nodes),
            total_edges=len(response_edges)
        )

    def detect_subgraph_cycles(self, G: nx.MultiDiGraph, max_len: int = 5) -> list[CyclePath]:
        """Detect simple directed cycles in graph."""
        # Convert to simple DiGraph for cycle detection
        simple_G = nx.DiGraph()
        for u, v, data in G.edges(data=True):
            simple_G.add_edge(u, v)

        detected_cycles = []
        MAX_DETECTED_CYCLES = 50
        try:
            for cycle in nx.simple_cycles(simple_G):
                if 3 <= len(cycle) <= max_len:
                    # Trace cycle transactions
                    cycle_tids = []
                    total_amt = 0.0
                    timestamps = []
                    
                    # Check cycle edges
                    for i in range(len(cycle)):
                        u = cycle[i]
                        v = cycle[(i + 1) % len(cycle)]
                        if G.has_edge(u, v):
                            # take highest transfer edge between u and v
                            edge_data = list(G.get_edge_data(u, v).values())[0]
                            cycle_tids.append(edge_data.get("transaction_id", ""))
                            total_amt += edge_data.get("amount", 0.0)
                            ts = edge_data.get("timestamp")
                            if ts:
                                timestamps.append(ts)

                    duration_hours = 0.0
                    if len(timestamps) >= 2:
                        min_t = min(timestamps)
                        max_t = max(timestamps)
                        duration_hours = (max_t - min_t).total_seconds() / 3600.0

                    detected_cycles.append(CyclePath(
                        path=[str(node) for node in cycle + [cycle[0]]],
                        length=len(cycle),
                        total_amount=round(total_amt, 2),
                        duration_hours=round(duration_hours, 2),
                        transaction_ids=[str(tid) for tid in cycle_tids]
                    ))
                    if len(detected_cycles) >= MAX_DETECTED_CYCLES:
                        break
        except Exception:
            return detected_cycles
        return detected_cycles

    def check_circular_path_for_account(self, account_id: str, max_hops: int = 5) -> list[dict]:
        """Check if account is part of an active circular laundering loop."""
        if not self.graph.has_node(account_id):
            return []
        
        # Bounded 3-hop neighborhood
        sub_nodes = {account_id}
        frontier = {account_id}
        for _ in range(max_hops):
            nxt = set()
            for n in frontier:
                nxt.update(self.graph.successors(n))
            sub_nodes.update(nxt)
            frontier = nxt
            if len(sub_nodes) > 50:
                break
                
        subG = self.graph.subgraph(sub_nodes)
        cycles = self.detect_subgraph_cycles(subG, max_len=max_hops)
        account_cycles = [c.model_dump() for c in cycles if account_id in c.path]
        return account_cycles

    def check_rapid_onward_flow(self, account_id: str, current_txn: Transaction, window_minutes: int = 30, pass_through_ratio: float = 0.85) -> dict | None:
        """
        Check if account received money recently and current transaction sends out >= 85% of it.
        """
        if not self.graph.has_node(account_id):
            return None

        # Inspect incoming edges to this account
        in_edges = self.graph.in_edges(account_id, data=True)
        recent_inflows = []
        curr_ts = current_txn.timestamp
        if curr_ts and curr_ts.tzinfo is None:
            curr_ts = curr_ts.replace(tzinfo=timezone.utc)

        for u, v, data in in_edges:
            ts = data.get("timestamp")
            if ts:
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                if ts < curr_ts:
                    delta = (curr_ts - ts).total_seconds() / 60.0
                    if 0 <= delta <= window_minutes:
                        recent_inflows.append((data.get("amount", 0.0), delta, data.get("transaction_id")))

        if not recent_inflows:
            return None

        # Check if any incoming amount is close to current outgoing amount
        for in_amt, delta_mins, in_tid in recent_inflows:
            if in_amt >= 100000.0: # Minimum ₹1,00,000 threshold
                ratio = current_txn.amount / in_amt
                if ratio >= pass_through_ratio:
                    return {
                        "incoming_amount_inr": in_amt,
                        "outgoing_amount_inr": current_txn.amount,
                        "pass_through_ratio": round(ratio, 2),
                        "delta_minutes": round(delta_mins, 1),
                        "incoming_transaction_id": in_tid
                    }
        return None

# Singleton graph engine instance
graph_engine = GraphIntelligenceEngine()
