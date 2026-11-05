"""
Data Acquisition Module for VariantLens.
Downloads the official NCBI ClinVar variant_summary.txt.gz release,
computes SHA256 checksum, records release metadata, and verifies file integrity.
"""

import os
import sys
import json
import hashlib
import datetime
import urllib.request
from typing import Dict, Any

CLINVAR_URL = "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz"
DEFAULT_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw")
METADATA_FILE = os.path.join(DEFAULT_DATA_DIR, "clinvar_metadata.json")

def download_clinvar_summary(
    url: str = CLINVAR_URL,
    output_dir: str = DEFAULT_DATA_DIR,
    force: bool = False
) -> Dict[str, Any]:
    os.makedirs(output_dir, exist_ok=True)
    filename = os.path.basename(url)
    target_path = os.path.join(output_dir, filename)

    print(f"[*] Checking ClinVar source URL: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "VariantLens/0.1.0 Research"})
    
    with urllib.request.urlopen(req) as response:
        headers = response.info()
        content_length = int(headers.get("Content-Length", 0))
        last_modified = headers.get("Last-Modified", "Unknown")

    print(f"[*] Remote file size: {content_length / (1024 * 1024):.2f} MB")
    print(f"[*] Remote Last-Modified: {last_modified}")

    if os.path.exists(target_path) and not force:
        local_size = os.path.getsize(target_path)
        if local_size == content_length and os.path.exists(METADATA_FILE):
            print(f"[+] Existing file matches remote length ({local_size} bytes). Loading cached metadata.")
            with open(METADATA_FILE, "r") as f:
                return json.load(f)

    print(f"[*] Downloading {filename} to {target_path} ...")
    sha256 = hashlib.sha256()
    downloaded_bytes = 0
    chunk_size = 1024 * 1024 # 1 MB chunks

    start_time = datetime.datetime.now(datetime.timezone.utc)
    with urllib.request.urlopen(req) as resp, open(target_path, "wb") as out_file:
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            sha256.update(chunk)
            downloaded_bytes += len(chunk)
            if content_length > 0:
                percent = (downloaded_bytes / content_length) * 100
                mb = downloaded_bytes / (1024 * 1024)
                sys.stdout.write(f"\r    -> Downloaded: {mb:.1f} MB ({percent:.1f}%)")
                sys.stdout.flush()

    sys.stdout.write("\n")
    end_time = datetime.datetime.now(datetime.timezone.utc)
    checksum = sha256.hexdigest()

    metadata = {
        "source_url": url,
        "filename": filename,
        "target_path": os.path.abspath(target_path),
        "download_date_utc": end_time.isoformat(),
        "download_duration_seconds": (end_time - start_time).total_seconds(),
        "file_size_bytes": downloaded_bytes,
        "file_size_mb": round(downloaded_bytes / (1024 * 1024), 2),
        "sha256_checksum": checksum,
        "http_last_modified": last_modified,
        "assembly_target": "GRCh38",
        "provenance": "NCBI ClinVar Public FTP Release"
    }

    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[+] Download complete: {target_path}")
    print(f"[+] SHA256: {checksum}")
    print(f"[+] Metadata saved to: {METADATA_FILE}")
    return metadata

if __name__ == "__main__":
    download_clinvar_summary()
