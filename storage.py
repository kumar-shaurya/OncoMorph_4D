from typing import Dict, Any


# ---------------------------------------------------------
# IN-MEMORY SCAN STORE
# ---------------------------------------------------------

scans: Dict[str, Dict[str, Any]] = {}


def add_scan(scan_id: str, scan_data: Dict[str, Any]):
    scans[scan_id] = scan_data


def get_scan(scan_id: str):
    return scans.get(scan_id)


def remove_scan(scan_id: str):
    if scan_id in scans:
        del scans[scan_id]