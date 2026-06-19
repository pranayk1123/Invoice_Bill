"use client";
import { useState, useRef } from "react";
import { toPng } from 'html-to-image'; 

const convertNumberToWords = (amount: number) => {
  if (amount === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  const numToWords = (n: number) => {
    let str = "";
    if (n > 99) { str += a[Math.floor(n / 100)] + " Hundred "; n %= 100; }
    if (n > 19) { str += b[Math.floor(n / 10)] + " "; n %= 10; }
    if (n > 0) { str += a[n] + " "; }
    return str;
  };

  let result = "";
  let n = Math.floor(amount);
  if (n > 9999999) { result += numToWords(Math.floor(n / 10000000)) + "Crore "; n %= 10000000; }
  if (n > 99999) { result += numToWords(Math.floor(n / 100000)) + "Lakh "; n %= 100000; }
  if (n > 999) { result += numToWords(Math.floor(n / 1000)) + "Thousand "; n %= 1000; }
  if (n > 0) { result += numToWords(n); }
  
  return result.trim() + " Rupees Only";
};

export default function InvoiceGenerator() {
  const invoiceRef = useRef<HTMLDivElement>(null); 
  const [formData, setFormData] = useState({
    customerName: "",
    invoiceNo: "",
    date: "",
  });

  const [items, setItems] = useState([{ id: 1, particulars: "", qty: 1, rate: 0 }]);

  const addItem = () => setItems([...items, { id: items.length + 1, particulars: "", qty: 1, rate: 0 }]);

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items] as any;
    newItems[index][field] = value;
    setItems(newItems);
  };

  const downloadAsImage = async () => {
    if (invoiceRef.current === null) return;
    
    try {
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `Invoice_${formData.invoiceNo || "Bill"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Oops, something went wrong!", err);
    }
  };

  const shareInvoice = async () => {
    if (invoiceRef.current === null) return;

    try {
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true, pixelRatio: 2 });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `Invoice_${formData.invoiceNo || "Bill"}.png`, { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Invoice from Shekhar Kalekar',
            files: [file]
          });
          return; 
        } catch (e) {
          console.log("Share cancelled by user");
        }
      } else {
        try {
          const clipboardItem = new ClipboardItem({ [blob.type]: blob });
          await navigator.clipboard.write([clipboardItem]);
          alert("✅ The bill photo has been copied! Now open WhatsApp and paste it there.");
        } catch (clipboardError) {
          const link = document.createElement("a");
          link.download = `Invoice_${formData.invoiceNo || "Bill"}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch (err) {
      console.error("Error sharing invoice:", err);
    }
  };

  const grandTotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty), 0);
  const amountInWordsAuto = convertNumberToWords(grandTotal);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10 flex flex-col items-center font-sans text-black">
      
      {/* Input Form */}
      <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg mb-10 print:hidden border-t-4 border-blue-500">
        <h2 className="text-xl font-bold mb-6 text-slate-800 border-b pb-2">Enter Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Customer Name & Address (M/s.)</label>
            <textarea rows={2} className="w-full border p-2 rounded mt-1 text-black" onChange={(e) => setFormData({...formData, customerName: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice No. / Date</label>
            <div className="flex gap-2">
              <input type="text" placeholder="No." className="w-1/2 border p-2 rounded mt-1 text-black" onChange={(e) => setFormData({...formData, invoiceNo: e.target.value})} />
              <input type="date" className="w-1/2 border p-2 rounded mt-1 text-black" onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Particulars (Items)</label>
          {items.map((item, index) => (
            <div key={item.id} className="flex gap-2 mb-2">
              <input type="text" placeholder="Particulars" className="flex-1 border p-2 rounded text-black" onChange={(e) => handleItemChange(index, 'particulars', e.target.value)} />
              <input type="number" placeholder="Qty" className="w-20 border p-2 rounded text-black" onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))} />
              <input type="number" placeholder="Rate" className="w-32 border p-2 rounded text-black" onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))} />
              <button onClick={() => removeItem(index)} className="bg-red-500 text-white px-3 py-1 rounded font-bold hover:bg-red-700 flex items-center justify-center text-lg">-</button>
            </div>
          ))}
          <button onClick={addItem} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200 mt-1">+ Add Row</button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Amount in Words (Auto Generated)</label>
          <input type="text" className="w-full border p-2 rounded mt-1 text-black bg-gray-100 font-bold" value={amountInWordsAuto} readOnly />
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap gap-4 mt-8">
          <button onClick={() => window.print()} className="flex-1 min-w-[150px] bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md uppercase tracking-wider">
            Print / PDF
          </button>
          <button onClick={downloadAsImage} className="flex-1 min-w-[150px] bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all shadow-md uppercase tracking-wider">
            Download Image
          </button>
          <button onClick={shareInvoice} className="flex-1 min-w-[150px] bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-all shadow-md uppercase tracking-wider">
            Share Bill
          </button>
        </div>
      </div>

      {/* --- Actual Bill Template --- */}
      <div ref={invoiceRef} className="w-[210mm] min-h-[297mm] bg-white border border-gray-300 p-10 text-black shadow-2xl print:shadow-none print:m-0 print:border-none flex flex-col">
        <div className="text-right text-xs font-semibold uppercase">Mobile : 9702064094</div>
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-5xl font-black italic tracking-tighter text-gray-900 uppercase">SHEKHAR KALEKAR</h1>
          <p className="text-md font-medium mt-1 uppercase tracking-wide">Repairing of All type of Printer LCD & Laptop</p>
          <p className="text-xs mt-1 text-gray-600 font-bold">7 / Arjun chawl, Tanaji wadi, T. P. Road, Bhandup West, Mumbai - 400078.</p>
        </div>

        <h2 className="text-center text-xl font-bold border border-black py-1 mb-6 bg-gray-50 uppercase tracking-[0.5em]">Invoice</h2>

        <div className="flex border border-black mb-6 min-h-[100px]">
          <div className="w-3/5 border-r border-black p-3 text-black">
            <span className="font-bold text-sm block mb-1">M/s.</span>
            <div className="text-sm font-semibold leading-tight px-2 uppercase whitespace-pre-wrap">{formData.customerName || "_______________________"}</div>
          </div>
          <div className="w-2/5 p-3 flex flex-col justify-between text-sm text-black">
            <div className="flex justify-between">
              <span className="font-bold underline decoration-dotted">INVOICE NO:</span>
              <span className="font-mono font-bold uppercase">{formData.invoiceNo || "_____"}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-bold underline decoration-dotted">DATE:</span>
              <span className="font-bold">{formData.date || "__/__/____"}</span>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse border border-black flex-1">
          <thead>
            <tr className="border-b border-black bg-gray-50 font-bold uppercase text-sm">
              <th className="w-16 border-r border-black py-2">Sr. No.</th>
              <th className="border-r border-black py-2 text-left px-4">Particulars</th>
              <th className="w-24 border-r border-black py-2">Qty</th>
              <th className="w-32 py-2">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b border-black align-top h-10">
                <td className="border-r border-black text-center py-2">{index + 1}.</td>
                <td className="border-r border-black px-4 py-2 font-medium italic uppercase">{item.particulars}</td>
                <td className="border-r border-black text-center py-2">{item.qty}</td>
                <td className="text-center py-2 font-bold">{(item.qty * item.rate).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="flex-1 border-b border-black">
                <td className="border-r border-black min-h-[400px]"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td></td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-black uppercase tracking-widest">
              <td colSpan={2} className="border-r border-black text-center py-2">Total</td>
              <td className="border-r border-black text-center">{totalQty}</td>
              <td className="text-center py-2 text-lg font-black tracking-wider">₹ {grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer Area */}
        <div className="mt-8 flex justify-between items-end">
          
          <div className="w-3/5">
            <p className="text-xs font-bold uppercase underline">Amount in Words:</p>
            <p className="text-sm italic font-semibold mt-1 text-slate-700 uppercase">{amountInWordsAuto}</p>
            
            {/* क्यूआर आणि Bank Details चा सेक्शन - इथे items-start केले आहे */}
            <div className="mt-4 flex gap-4 items-start">
              <div className="flex flex-col items-center">
                <div className="w-28 h-28 border border-black p-1 flex items-center justify-center bg-gray-50">
                  <a href="upi://pay?pa=shekharkalekar22-1@okhdfcbank&pn=Shekhar%20Tanaji%20Kalekar&cu=INR" className="w-full h-full block">
                    <img src="/qr.png" alt="QR Code" className="max-w-full max-h-full object-contain block mx-auto" />
                  </a>
                </div>
                <p className="text-[10px] font-bold mt-1 text-gray-600 uppercase tracking-tighter text-center">tap on qr to direct payment</p>
              </div>
              
              {/* अचूक Bank Details */}
              <div className="text-[12px] leading-snug text-gray-800">
                <p className="font-bold underline uppercase mb-1 text-[13px]">Bank Details For Payment:</p>
                <p><span className="font-bold">Name:</span> Shekhar Tanaji Kalekar</p>
                <p><span className="font-bold">Bank:</span> Abhyudaya CO-OP. Bank LTD</p>
                <p><span className="font-bold">A/C No:</span> 004011100080789</p>
                <p><span className="font-bold">IFSC:</span> ABHY0065004</p>
                <p>
                  <span className="font-bold">UPI ID:</span>{" "}
                  <a 
                    href="upi://pay?pa=shekharkalekar22-1@okhdfcbank&pn=Shekhar%20Tanaji%20Kalekar&cu=INR" 
                    className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                  >
                    shekharkalekar22-1@okhdfcbank
                  </a>
                </p>
              </div>
            </div>
            
          </div>
          
          <div className="text-center flex flex-col items-center">
            <p className="text-[10px] font-bold mb-1 uppercase tracking-tighter">For SHEKHAR KALEKAR</p>
            <div className="h-16 w-40 flex items-center justify-center">
              <img src="/signature.png" alt="Signature" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="w-40 border-t border-black pt-1 mt-1 font-bold text-[10px] uppercase text-center">Proprietor / Signature</div>
          </div>
          
        </div>
      </div>
    </div>
  );
}