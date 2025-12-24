// app/admin/events/InvoiceModal.tsx
'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function InvoiceModal({ event }: { event: any }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // State form invoice (Tidak masuk database, cuma buat PDF)
  const [clientName, setClientName] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('Terima kasih telah menggunakan jasa SnapBooth.');

  const generatePDF = () => {
    if (!clientName || !price) {
        toast.error("Nama Klien dan Harga wajib diisi!");
        return;
    }

    const doc = new jsPDF();
    
    // 1. Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald Color
    doc.text("SNAPBOOTH INVOICE", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Professional Photobooth Services", 14, 26);
    doc.text(`Date: ${new Date().toLocaleDateString('id-ID')}`, 14, 32);

    // 2. Bill To
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Tagihan Kepada:", 14, 45);
    doc.setFont("helvetica", "bold");
    doc.text(clientName.toUpperCase(), 14, 52);
    doc.setFont("helvetica", "normal");

    // 3. Tabel Detail
    autoTable(doc, {
      startY: 60,
      head: [['Deskripsi Layanan', 'Detail', 'Harga']],
      body: [
        ['Nama Event', event.name, ''],
        ['Kode Akses Login', event.access_code, ''],
        ['Limit Kuota Foto', event.max_sessions === 0 ? 'Unlimited' : `${event.max_sessions} Sesi`, ''],
        ['Durasi Layanan', event.expires_at ? `Hingga ${new Date(event.expires_at).toLocaleString()}` : 'Selamanya', ''],
        ['Paket Photobooth', 'Full Service', `Rp ${Number(price).toLocaleString('id-ID')}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 80 },
        2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      }
    });

    // 4. Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: Rp ${Number(price).toLocaleString('id-ID')}`, 195, finalY, { align: 'right' });

    // 5. Footer / Notes
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text(`Catatan: ${notes}`, 14, finalY + 20);
    
    doc.save(`Invoice_${event.name.replace(/\s/g, '_')}.pdf`);
    setIsOpen(false);
    toast.success("Invoice berhasil didownload!");
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
        title="Download Invoice"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm z-[9999]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                📄 Generate Invoice
            </h2>
            <div className="space-y-4">
               <div>
                    <label className="block text-sm font-medium mb-1">Nama Klien / Instansi</label>
                    <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full border rounded p-2" placeholder="Contoh: Bpk. Budi / PT. Maju Jaya" autoFocus />
               </div>
               <div>
                    <label className="block text-sm font-medium mb-1">Total Harga Deal (Rp)</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border rounded p-2" placeholder="Contoh: 3500000" />
               </div>
               <div>
                    <label className="block text-sm font-medium mb-1">Catatan Tambahan (Opsional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded p-2 text-sm" rows={2} />
               </div>

               <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                   <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                   <button onClick={generatePDF} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                       Download PDF
                   </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}