import React from 'react';
import Logo from '../assets/Logo.png';

const InvoicePrintTemplate = ({ invoice, items, centerName }) => {
  if (!invoice) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="printable-root-container">
      {/* 
          IMPORTANT: This container is standard in the UI, 
          but becomes the ONLY thing visible in print mode.
      */}
      <div id="printable-invoice-content" className="invoice-sheet">
        {/* Computer Note */}
        <div className="top-disclaimer">
          ** This is a computer-generated document and does not require a physical signature.
        </div>

        {/* Header Accent */}
        <div className="header-heavy-line"></div>

        {/* Identity Section */}
        <div className="invoice-header-row">
          <div className="identity-block">
            <img src={Logo} alt="ISML" className="logo-main" />
            <div className="header-v-sep"></div>
            <div className="identity-text">
              <h1 className="company-name-bold">Indian School for Modern Languages</h1>
              <p className="academic-doc-subtitle">Official Academic Settlement Document</p>
            </div>
          </div>
          <div className="doc-meta-block">
            <span className="doc-label-text">Document Type</span>
            <h2 className="doc-title-text">Invoice</h2>
          </div>
        </div>

        {/* Details Grid */}
        <div className="details-grid-row">
          <div className="details-col">
            <h3 className="grid-label-small">From</h3>
            <div className="entity-info-block">
              <p className="entity-title-lg">{centerName || 'N/A'}</p>
              <p className="entity-type-label">Authorized Training Center</p>
              <div className="entity-id-space">
                <p className="entity-id-tag">Settlement ID: <span className="mono-code">{invoice.invoice_number}</span></p>
              </div>
            </div>
          </div>

          <div className="details-col">
            <h3 className="grid-label-small">Bill To</h3>
            <div className="entity-info-block">
              <p className="entity-title-bold">ISML Head Office</p>
              <p className="entity-address-line">8/3, Athreyapuram 2nd Street,</p>
              <p className="entity-address-line">Choolaimedu, Chennai – 600094.</p>
              <div className="entity-contact-space">
                <p className="entity-address-line">enquiry.isml@gmail.com</p>
                <p className="entity-address-line">+91 7338880780</p>
              </div>
            </div>
          </div>

          <div className="details-col text-right">
            <h3 className="grid-label-small">Status</h3>
            <div className="status-item-stack">
              <div className="status-item-row">
                <span className="status-label-xs">Issue Date</span>
                <p className="status-value-bold">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div className="status-item-row">
                <span className="status-label-xs">Billing Phase</span>
                <p className="status-value-bold">Cycle #{invoice.cycle_number} Verification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Period Line */}
        <div className="payment-period-box">
          Payment Period : {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
        </div>

        {/* Table Area */}
        <div className="table-print-wrapper">
          <table className="print-main-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>S.No</th>
                <th style={{ textAlign: 'left' }}>Student Info</th>
                <th style={{ textAlign: 'center' }}>Course</th>
                <th style={{ textAlign: 'center' }}>Date</th>
                <th style={{ textAlign: 'center' }}>Term</th>
                <th style={{ textAlign: 'center' }}>Disc.</th>
                <th style={{ textAlign: 'center' }}>Fee Paid</th>
                <th style={{ textAlign: 'center' }}>Net Amount</th>
                <th style={{ textAlign: 'center' }}>Payout</th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                <>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td>
                        <div className="table-stu-name">{item.student_name}</div>
                        <div className="table-stu-reg">{item.registration_number}</div>
                      </td>
                      <td style={{ textAlign: 'center', textTransform: 'uppercase' }}>{item.course_name}</td>
                      <td style={{ textAlign: 'center' }}>{formatDate(item.transaction_date)}</td>
                      <td style={{ textAlign: 'center', textTransform: 'uppercase' }}>{item.fee_term || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{item.elite_discount || '0%'}</td>
                      <td style={{ textAlign: 'center' }}>INR {Number(item.fee_paid || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td style={{ textAlign: 'center' }}>INR {Number(item.net_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td style={{ textAlign: 'center', fontWeight: '700' }}>INR {Number(item.center_share || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                  <tr className="footer-total-row">
                    <td colSpan="8" className="footer-total-label">Total Payout Amount:</td>
                    <td className="footer-total-value">INR {Number(invoice.total_center_share || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan="9" className="no-data-text">No Settlement Data Available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Area */}
        <div className="invoice-footer-row">
          <div className="footer-brand-side">
            <p className="footer-website">www.indianschoolformodernlanguages.com</p>
            <p className="footer-slogan-italic">Empowering Education Through Innovation</p>
          </div>
          <div className="footer-signature-side">
            <div className="signature-underline-box">
              <span className="signature-label-text">Authorized Signature</span>
            </div>
            <p className="legal-disclaimer-text">
              Certified computer-generated document.<br />
              Commercial validity does not require physical signature.
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* --- UI DESIGN --- */
        .printable-root-container {
          background-color: transparent;
          display: flex;
          justify-content: center;
        }
        .invoice-sheet {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          padding: 40px;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, sans-serif;
          color: #111;
        }
        .top-disclaimer { text-align: right; font-size: 10px; color: #94a3b8; font-style: italic; margin-bottom: 6px; }
        .header-heavy-line { height: 4px; background: #000; margin-bottom: 40px; }
        .invoice-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; }
        .identity-block { display: flex; align-items: center; gap: 20px; }
        .logo-main { width: 62px; height: 62px; object-fit: contain; }
        .header-v-sep { width: 1px; height: 40px; background: #f1f5f9; }
        .company-name-bold { font-size: 19px; font-weight: 800; text-transform: uppercase; margin: 0; }
        .academic-doc-subtitle { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin: 2px 0 0 0; }
        .doc-label-text { font-size: 9px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 2px; }
        .doc-title-text { font-size: 32px; font-weight: 200; text-transform: uppercase; margin: 0; letter-spacing: 4px; }

        .details-grid-row { display: flex; justify-content: space-between; gap: 40px; margin-bottom: 40px; }
        .details-col { flex: 1; }
        .grid-label-small { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #f8fafc; padding-bottom: 4px; margin-bottom: 12px; }
        .entity-title-lg { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0; }
        .entity-title-bold { font-size: 12px; font-weight: 700; margin: 0; }
        .entity-type-label { font-size: 11px; color: #94a3b8; font-weight: 500; }
        .entity-address-line { font-size: 11px; color: #64748b; line-height: 1.4; margin: 0; }
        .entity-id-space, .entity-contact-space { margin-top: 8px; }
        .entity-id-tag { font-size: 11px; font-weight: 700; }
        .mono-code { font-family: monospace; }
        .status-item-stack { display: flex; flex-direction: column; gap: 14px; }
        .status-label-xs { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; }
        .status-value-bold { font-size: 13px; font-weight: 700; margin: 0; }
        .text-right { text-align: right; }

        .payment-period-box { background: #fcfdfe; border: 1px solid #f1f5f9; padding: 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #333; margin-bottom: 30px; letter-spacing: 0.5px; }

        .print-main-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .print-main-table th { padding: 12px 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; border-top: 2px solid #000; border-bottom: 2px solid #000; color: #000; }
        .print-main-table td { padding: 14px 8px; font-size: 10px; border-bottom: 1px solid #f1f5f9; color: #444; }
        .table-stu-name { font-weight: 700; text-transform: uppercase; font-size: 10.5px; color: #111; }
        .table-stu-reg { font-size: 9px; color: #94a3b8; font-family: monospace; margin-top: 2px; }
        .footer-total-row { background: #fafbfc; }
        .footer-total-label { text-align: right; padding: 20px !important; font-weight: 900; text-transform: uppercase; font-size: 11px; }
        .footer-total-value { text-align: center; font-weight: 900; font-size: 13px; color: #000; }
        .no-data-text { padding: 40px; text-align: center; color: #cbd5e1; text-transform: uppercase; font-size: 11px; }

        .invoice-footer-row { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #f1f5f9; padding-top: 40px; margin-top: 20px; }
        .footer-website { font-size: 10px; font-weight: 800; color: #000; margin: 0; }
        .footer-slogan-italic { font-size: 10px; color: #94a3b8; font-style: italic; margin: 0; }
        .signature-underline-box { border-bottom: 1.5px solid #000; padding: 0 40px 8px 40px; margin-bottom: 12px; }
        .signature-label-text { font-size: 10px; font-weight: 900; text-transform: uppercase; }
        .legal-disclaimer-text { font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700; line-height: 1.4; text-align: right; }

        /* --- THE SURGICAL PRINT RECOVERY --- */
        @media print {
          /* 1. Reset Root Visualization */
          @page {
            size: A4;
            margin: 0;
          }
          
          /* 2. COMPLETELY hide the screen body using visibility */
          body {
            visibility: hidden !important;
            background-color: #fff !important;
          }

          /* 3. Surgically un-hide the invoice content */
          /* Using Fixed positioning to bypass any parent Clipping/Hidden issues */
          #printable-invoice-content, 
          #printable-invoice-content * {
            visibility: visible !important;
            opacity: 1 !important;
          }

          #printable-invoice-content {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            background-color: #fff !important;
            padding: 15mm !important;
            margin: 0 !important;
            display: block !important;
            z-index: 99999999 !important;
          }

          /* 4. Hide aggressive app artifact keywords */
          nav, sidebar, .portal, .navbar, .no-print, [role="navigation"], button, .modal-header {
             display: none !important;
          }

          /* 5. Chrome Print Layout Fixes */
          .invoice-header-row, .identity-block, .details-grid-row, .invoice-footer-row {
            display: flex !important;
            flex-direction: row !important;
          }
          .status-item-stack { display: flex !important; flex-direction: column !important; }
          
          /* 6. General Polish */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />
    </div>
  );
};

export default InvoicePrintTemplate;
