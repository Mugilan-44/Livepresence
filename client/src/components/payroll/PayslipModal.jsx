import React, { useState } from 'react';
import { Download, Printer, X } from 'lucide-react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function PayslipModal({ record, user, company, onClose }) {
  const [downloading, setDownloading] = useState(false);
  if (!record || !user) return null;
  const deductions = Number(record.pf_deduction || 0) + Number(record.esi_deduction || 0) + Number(record.tax_tds || 0);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/payroll/${record.id}/payslip.pdf`);
      if (!response.ok) throw new Error('Could not create payslip PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prolync-Payslip-${user.employee_id}-${record.month_year}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || 'PDF download failed. Please try again.');
    } finally { setDownloading(false); }
  };

  const earnings = [['Basic salary', record.basic_salary], ['House rent allowance', record.hra_allowance], ['Special allowance', record.special_allowance]];
  const deductionRows = [['Provident fund', record.pf_deduction], ['ESI contribution', record.esi_deduction], ['Income tax (TDS)', record.tax_tds]];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl print:max-w-none print:shadow-none print:max-h-none print:overflow-visible">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between print:hidden">
          <p className="text-sm font-semibold text-slate-900">Payslip preview</p>
          <div className="flex gap-2">
            <button onClick={downloadPdf} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-semibold disabled:opacity-60"><Download className="w-3.5 h-3.5" />{downloading ? 'Preparing…' : 'Download PDF'}</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"><Printer className="w-3.5 h-3.5" />Print</button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-900"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <article className="p-8 sm:p-10 text-slate-900 print:p-6">
          <header className="flex justify-between gap-6 border-b border-slate-300 pb-5">
            <div className="flex items-center gap-3"><img src="/logo.png" alt="Prolync" className="w-11 h-11 object-contain" /><div><h1 className="text-lg font-bold">Prolync</h1><p className="text-xs text-slate-500">People Operations</p></div></div>
            <div className="text-right"><p className="text-[10px] tracking-[0.16em] font-semibold text-slate-500">PAYSLIP FOR THE MONTH</p><p className="text-sm font-bold mt-1">{record.month_year}</p></div>
          </header>

          <section className="grid sm:grid-cols-[1.4fr_0.8fr] gap-8 py-5">
            <div><p className="text-[10px] tracking-wider font-bold text-slate-500 mb-2">EMPLOYEE SUMMARY</p>{[['Employee name', user.name], ['Designation', user.title || user.designation], ['Employee ID', user.employee_id], ['Department', user.department], ['Date of joining', user.joining_date]].map(([label, value]) => <div key={label} className="grid grid-cols-[110px_1fr] text-xs py-1"><span className="text-slate-500">{label}</span><span className="font-medium">{value || '-'}</span></div>)}</div>
            <div className="rounded-lg border border-emerald-200 overflow-hidden self-start"><div className="bg-emerald-50 px-4 py-3"><p className="text-xl font-bold">{money(record.net_salary)}</p><p className="text-[10px] text-slate-500 mt-1">Employee net pay</p></div><div className="p-4 text-xs space-y-2"><div className="flex justify-between"><span className="text-slate-500">Payment status</span><span className="font-semibold">{record.payment_status}</span></div><div className="flex justify-between"><span className="text-slate-500">Payment date</span><span className="font-semibold">{record.payment_date || '-'}</span></div></div></div>
          </section>

          <div className="border border-slate-300 rounded-lg overflow-hidden text-xs"><div className="grid grid-cols-2 bg-slate-50 font-bold"><p className="px-4 py-3">EARNINGS</p><p className="px-4 py-3 border-l border-slate-300">DEDUCTIONS</p></div><div className="grid grid-cols-2"><div className="p-4 space-y-3">{earnings.map(([label, value]) => <Row key={label} label={label} value={money(value)} />)}<Row label="Gross earnings" value={money(record.gross_salary)} strong /></div><div className="p-4 space-y-3 border-l border-slate-300">{deductionRows.map(([label, value]) => <Row key={label} label={label} value={money(value)} />)}<Row label="Total deductions" value={money(deductions)} strong /></div></div></div>
          <div className="mt-5 border border-emerald-200 bg-emerald-50 rounded-lg px-4 py-3 flex justify-between items-center"><div><p className="text-xs font-bold">TOTAL NET PAYABLE</p><p className="text-[10px] text-slate-500 mt-1">Gross earnings minus total deductions</p></div><p className="text-base font-bold">{money(record.net_salary)}</p></div>
          <p className="mt-7 text-center text-[9px] text-slate-400">This document has been automatically generated by Prolync LivePresence | Prolync Infotech Pvt. Ltd. – no signature required.</p>
        </article>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) { return <div className={`flex justify-between gap-3 ${strong ? 'border-t border-slate-200 pt-3 font-bold text-slate-900' : 'text-slate-600'}`}><span>{label}</span><span className="font-medium text-slate-900">{value}</span></div>; }
