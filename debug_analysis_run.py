import os
import sys
import json
import traceback

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from storage_service import storage
from pdf_service import pdf_svc
from gemini_service import gemini_pool

def test_full_pipeline():
    # 1. Find folder
    folders = storage.get_folders()
    print(f"Total folders: {len(folders)}")
    for f in folders:
        print(f"  - Folder ID: {f.get('id')}, Name: {f.get('name')}, File count: {f.get('file_count')}")

    target_folder = folders[0]
    folder_id = target_folder.get("id")
    folder_dir = os.path.join(storage.folders_dir, folder_id)
    pdf_paths = [os.path.join(folder_dir, fn) for fn in os.listdir(folder_dir) if fn.lower().endswith(".pdf")]
    print(f"\nProcessing {len(pdf_paths)} PDFs in folder {folder_id}...")

    # 2. Extract text
    combined_text, doc_summaries = pdf_svc.extract_folder_documents(pdf_paths)
    print(f"Combined text length: {len(combined_text)} chars across {len(doc_summaries)} docs.")

    # 3. Test Batch 1 of Criteria
    criteria = storage.get_criteria(active_only=True)
    print(f"Active criteria points: {len(criteria)}")
    batch_1 = criteria[:5]
    print(f"Running Batch 1 ({len(batch_1)} items): {[c['question'] for c in batch_1]}")

    try:
        results = gemini_pool.analyze_batch_questions(combined_text, batch_1)
        print(f"\nBatch 1 Results Count: {len(results)}")
        for r in results:
            print(f"  Q: {r.get('question')}")
            print(f"    Status: {r.get('status')}")
            print(f"    Answer: {r.get('answer')[:80] if r.get('answer') else '-'}")
            print(f"    Source: {r.get('source')}")
    except Exception as e:
        print(f"\n!!! ERROR IN BATCH 1: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_full_pipeline()
