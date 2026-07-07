import React from 'react';

interface PrintHeaderProps {
  title: string;
  companyName?: string;
  period?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, companyName = 'Organization', period }) => {
  return (
    <>
      <div className="print-running-header">
        <span>{companyName} — {title}</span>
        {period && <span>{period}</span>}
      </div>
      <div className="print-running-footer">
        <span>SECURE ERP COMPLIANCE HUB — Generated Report</span>
      </div>
    </>
  );
};
