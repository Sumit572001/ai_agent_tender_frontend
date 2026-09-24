"""
Pure Python script to generate a sample Tender PDF using pypdf.
"""
import os
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, ArrayObject, NumberObject, DecodedStreamObject

def create_raw_pdf(filename="sample_nhai_tender.pdf"):
    # Standard PDF 1.4 template with text streams
    content_p1 = """BT
/F1 16 Tf
50 750 Td
(NATIONAL HIGHWAYS AUTHORITY OF INDIA (NHAI)) Tj
/F1 12 Tf
0 -24 Td
(NOTICE INVITING TENDER (NIT) & BIDDING DOCUMENT) Tj
/F1 10 Tf
0 -20 Td
(Tender Reference / NIT No: NHAI/HQ/TECH/2026/EPC-089) Tj
0 -16 Td
(Name of Work: Construction of 4-Lane Greenfield Highway Corridor from Km 45 to 98) Tj
0 -16 Td
(Tendering Authority: National Highways Authority of India, Dwarka, New Delhi) Tj
0 -16 Td
(Estimated Project Cost: INR 485.50 Crores) Tj
0 -16 Td
(Contract Mode: EPC Lump-Sum Turnkey Contract) Tj
0 -16 Td
(Tender Portal: https://etenders.gov.in/eprocure/app - CPP Portal) Tj
0 -24 Td
(SECTION 1: KEY SCHEDULE & DATES) Tj
0 -16 Td
(Document Download Start Date: 10-October-2026 at 10:00 Hrs) Tj
0 -16 Td
(Pre-Bid Meeting Date & Venue: 22-October-2026 at 11:30 Hrs at Conference Hall-2, NHAI HQ) Tj
0 -16 Td
(Last Date for Submitting Pre-Bid Queries: 20-October-2026 up to 17:00 Hrs) Tj
0 -16 Td
(Bid Submission End Date / Due Date: 15-November-2026 up to 15:00 Hrs) Tj
0 -16 Td
(Technical Bid Opening Date: 16-November-2026 at 15:30 Hrs) Tj
0 -16 Td
(Bid Validity Period: 180 days from Bid Due Date) Tj
0 -16 Td
(Contract Completion Period: 24 Calendar Months from Appointed Date) Tj
ET"""

    content_p2 = """BT
/F1 12 Tf
50 750 Td
(SECTION 2: FEES, EMD & BANK GUARANTEES) Tj
/F1 10 Tf
0 -20 Td
(Tender Document Fee: INR 50,000/- Non-Refundable via Bharatkosh portal) Tj
0 -16 Td
(Earnest Money Deposit EMD: INR 4,85,00,000/- in the form of Bank Guarantee, valid 225 days) Tj
0 -16 Td
(EMD Exemption: MSEs / Startups registered with Udyam/NSIC are EXEMPTED from EMD and Tender Fee) Tj
0 -16 Td
(Performance Security PBG: 5% of Contract Value within 28 days of Letter of Acceptance LoA) Tj
0 -16 Td
(Additional Performance Security APS: 1% for each 1% below 10% estimated value) Tj
0 -24 Td
(SECTION 3: FINANCIAL & TECHNICAL ELIGIBILITY) Tj
0 -16 Td
(Minimum Average Annual Turnover AATO: INR 150 Crores in last 3 FY 2023-24, 2024-25, 2025-26 with CA UDIN) Tj
0 -16 Td
(Minimum Net Worth: Positive Net Worth of at least INR 50 Crores as on 31st March 2026) Tj
0 -16 Td
(Past Technical Experience: 1 completed similar Highway project of min INR 380 Cr or 2 projects of min INR 240 Cr) Tj
0 -16 Td
(Liquidated Damages LD: 0.05% of Contract Price per day of delay, Maximum Cap 10% of Contract Value) Tj
0 -16 Td
(Defect Liability Period DLP: 5 Years from date of Taking Over Certificate) Tj
0 -16 Td
(Mobilization Advance: 10% of Contract Value at 8.5% interest per annum against Bank Guarantee) Tj
0 -16 Td
(Joint Venture JV: Allowed up to maximum 3 partners, Lead Member min 51% share) Tj
0 -16 Td
(Make in India: Class-I Local Supplier min 50% local content preference applicable) Tj
0 -16 Td
(Arbitration & Governing Law: SAROD Arbitration in New Delhi, Indian Laws apply, Court jurisdiction New Delhi) Tj
ET"""

    # Assemble PDF bytes
    pdf_template = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length {len(content_p1.encode('utf-8'))} >>
stream
{content_p1}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 7 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
7 0 obj
<< /Length {len(content_p2.encode('utf-8'))} >>
stream
{content_p2}
endstream
endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000121 00000 n 
0000000234 00000 n 
0000000300 00000 n 
0000000367 00000 n 
0000000480 00000 n 
trailer
<< /Size 8 /Root 1 0 R >>
startxref
550
%%EOF
"""
    with open(filename, "wb") as f:
        f.write(pdf_template.encode("utf-8"))
    print(f"Created sample PDF: {filename}")
    return filename

if __name__ == "__main__":
    create_raw_pdf("sample_nhai_tender.pdf")
