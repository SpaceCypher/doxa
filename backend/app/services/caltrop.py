import os

class CaltropValidator:
    """
    Memetic Immune System.
    Validates newly synthesized beliefs against absolute reality constraints.
    """
    def __init__(self):
        invariants_str = os.getenv("PHYSICAL_INVARIANTS", "")
        if invariants_str:
            self.invariants = [i.strip().lower() for i in invariants_str.split(",") if i.strip()]
        else:
            self.invariants = [
                "water kills",
                "fire heals",
                "food poisons",
                "movement drains zero stamina"
            ]

    def validate_belief(self, node: str) -> bool:
        """
        Returns True if the belief is valid (safe to commit to SQLite).
        Returns False if the belief contradicts a physical invariant.
        """
        node_lower = node.lower()
        for invariant in self.invariants:
            if invariant in node_lower:
                return False
        return True

validator = CaltropValidator()
