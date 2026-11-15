"use client";
import { useState, useRef, useEffect } from "react";
import { toPng } from 'html-to-image'; 
import { jsPDF } from "jspdf"; 

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

// Quick chips for fast typing on mobile/desktop
const QUICK_ITEMS = [
  "Printer Servicing",
  "Toner Refilling",
  "Cartridge Replace",
  "Teflon & Pressure Roller",
  "Laptop Formatting & OS",
  "Laptop Servicing",
  "LCD / Display Repair",
  "Logic Card / Power Repair"
];

export default function InvoiceGenerator() {
  const invoiceRef = useRef<HTMLDivElement>(null); 
  const qrLinkRef = useRef<HTMLAnchorElement>(null);
  const upiTextLinkRef = useRef<HTMLAnchorElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // State for handling PDF HTTPS-to-UPI Redirect
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectUpiUrl, setRedirectUpiUrl] = useState("");

  // Security Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [securityPin, setSecurityPin] = useState("");
  const [isChecking, setIsChecking] = useState(false); // For "Authenticating" effect
  const [isAnimating, setIsAnimating] = useState(false); // For Printer animation

  const [actionType, setActionType] = useState<string | null>(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    customerName: "",
    invoiceNo: "101",
    date: getTodayDate(),
  });

  // State to toggle the optional Date column in items
  const [showItemDate, setShowItemDate] = useState(false);

  const [items, setItems] = useState([{ id: 1, itemDate: "", particulars: "", qty: "", rate: "" }]);

  // --- NEW FEATURES STATES ---
  const [customerMobile, setCustomerMobile] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);

    // Check if opened via PDF Payment Link (?pay=1&am=...)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("pay") === "1") {
        const am = params.get("am");
        const targetUpi = am && Number(am) > 0
          ? `upi://pay?pa=shekharkalekar22-1@okhdfcbank&pn=Shekhar%20Tanaji%20Kalekar&am=${am}&cu=INR`
          : `upi://pay?pa=shekharkalekar22-1@okhdfcbank&pn=Shekhar%20Tanaji%20Kalekar&cu=INR`;
        
        setRedirectUpiUrl(targetUpi);
        setIsRedirecting(true);
        window.location.href = targetUpi;
        return;
      }
    }

    // Check if device is already authenticated
    if (localStorage.getItem("invoiceAuth") === "true") {
      setIsAuthenticated(true);
    }

    const today = getTodayDate();
    const savedFormData = localStorage.getItem("invoiceFormData");
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData);
      // Always set today's date automatically when opening the app
      setFormData({ ...parsedData, date: today });
    } else {
      setFormData({ customerName: "", invoiceNo: "101", date: today });
    }

    const savedItems = localStorage.getItem("invoiceItems");
    if (savedItems) {
      setItems(JSON.parse(savedItems));
    }

    const savedShowItemDate = localStorage.getItem("invoiceShowItemDate");
    if (savedShowItemDate) {
      setShowItemDate(JSON.parse(savedShowItemDate));
    }

    const savedMobile = localStorage.getItem("invoiceCustomerMobile");
    if (savedMobile) setCustomerMobile(savedMobile);

    const savedIsPaid = localStorage.getItem("invoiceIsPaid");
    if (savedIsPaid) setIsPaid(JSON.parse(savedIsPaid));

    const savedHistory = localStorage.getItem("invoiceRecentBills");
    if (savedHistory) {
      try {
        setRecentBills(JSON.parse(savedHistory));
      } catch (e) {
        setRecentBills([]);
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted && isAuthenticated) {
      localStorage.setItem("invoiceFormData", JSON.stringify(formData));
      localStorage.setItem("invoiceItems", JSON.stringify(items));
      localStorage.setItem("invoiceShowItemDate", JSON.stringify(showItemDate));
      localStorage.setItem("invoiceCustomerMobile", customerMobile);
      localStorage.setItem("invoiceIsPaid", JSON.stringify(isPaid));
    }
  }, [formData, items, showItemDate, customerMobile, isPaid, isMounted, isAuthenticated]);

  const handleLogin = () => {
    if (securityPin === "9702" || securityPin === process.env.NEXT_PUBLIC_APP_PIN) {
      setIsChecking(true);

      // Step 1: Show authenticating... then start printing
      setTimeout(() => {
        setIsChecking(false);
        setSecurityPin("");
        setIsAuthenticated(true);
        setIsAnimating(true); // Start printer animation

        // Step 2: Stop animation and save session after paper rolls out
        setTimeout(() => {
          setIsAnimating(false);
          localStorage.setItem("invoiceAuth", "true");
        }, 2800); // Wait 2.8 seconds for smooth paper roll

      }, 800);
    } else {
      alert("❌ Wrong Security PIN!");
      setSecurityPin("");
    }
  };

  const lockApp = () => {
    localStorage.removeItem("invoiceAuth");
    setIsAuthenticated(false);
    setSecurityPin("");
    alert("🔒 App is now Locked!");
  };

  const addItem = () => {
    const nextIndex = items.length;
    setItems([...items, { id: Date.now(), itemDate: "", particulars: "", qty: "", rate: "" }]);
    setActiveRowIndex(nextIndex);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ id: Date.now(), itemDate: "", particulars: "", qty: "", rate: "" }]);
      return;
    }
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    setActiveRowIndex(Math.max(0, index - 1));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items] as any;
    newItems[index][field] = value;
    setItems(newItems);
  };

  // Helper to auto-increment invoice number (e.g. "105" -> "106", "INV-09" -> "INV-10")
  const getNextInvoiceNumber = (currentNo: string) => {
    if (!currentNo) return "101";
    const match = currentNo.match(/(\d+)$/);
    if (match) {
      const numStr = match[1];
      const nextNum = String(Number(numStr) + 1).padStart(numStr.length, "0");
      return currentNo.slice(0, -numStr.length) + nextNum;
    }
    return currentNo;
  };

  // Helper to save current bill into Recent 10 Bills History
  const saveCurrentBillToHistory = (silent = false) => {
    const hasData = formData.customerName.trim() !== "" || items.some(i => i.particulars.trim() !== "");
    if (!hasData) {
      if (!silent) alert("⚠️ Please enter Customer Name or Particulars before saving!");
      return;
    }

    const total = items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.rate) || 0)), 0);
    const savedDateStr = formData.date ? formData.date.split('-').reverse().join('/') : "";
    const billRecord = {
      id: Date.now(),
      label: `#${formData.invoiceNo || "---"} | ${formData.customerName.split('\n')[0] || "Customer"} | ₹${total} (${savedDateStr})`,
      formData: { ...formData },
      items: items.map(i => ({ ...i })),
      showItemDate,
      customerMobile,
      isPaid
    };

    // Keep maximum 50 recent bills, updating if same invoiceNo & customerName
    const currentList = Array.isArray(recentBills) ? recentBills : [];
    const filtered = currentList.filter(b => !(b.formData?.invoiceNo === formData.invoiceNo && b.formData?.customerName === formData.customerName));
    const updatedHistory = [billRecord, ...filtered].slice(0, 50);
    
    setRecentBills(updatedHistory);
    localStorage.setItem("invoiceRecentBills", JSON.stringify(updatedHistory));

    if (!silent) {
      alert(`✅ Bill #${formData.invoiceNo || "---"} saved in Recent Bills dropdown!`);
    }
  };

  const loadBillFromHistory = (billId: string) => {
    if (!billId) return;
    const found = recentBills.find(b => String(b.id) === String(billId));
    if (found) {
      setFormData(found.formData);
      setItems(found.items);
      setShowItemDate(found.showItemDate || false);
      setCustomerMobile(found.customerMobile || "");
      setIsPaid(found.isPaid || false);
      setShowRecentDropdown(false);
    }
  };

  // Delete a single bill from history
  const deleteSingleBillFromHistory = (billId: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = recentBills.filter(b => String(b.id) !== String(billId));
    setRecentBills(updatedHistory);
    localStorage.setItem("invoiceRecentBills", JSON.stringify(updatedHistory));
  };

  const clearSavedHistory = () => {
    if (recentBills.length === 0) return;
    if (window.confirm("Do you want to delete all saved Recent Bills history?")) {
      setRecentBills([]);
      localStorage.removeItem("invoiceRecentBills");
      setShowRecentDropdown(false);
    }
  };

  // Quick Chip Click Handler
  const handleQuickChipClick = (text: string) => {
    const targetIdx = activeRowIndex < items.length ? activeRowIndex : items.length - 1;
    const currentText = items[targetIdx]?.particulars || "";
    const updatedText = currentText.trim() ? `${currentText}\n• ${text}` : text;
    handleItemChange(targetIdx, "particulars", updatedText);
  };

  const clearForm = () => {
    if (window.confirm("Do you want to clear all data and create a new bill? (Current bill will be auto-saved in Recent Bills)")) {
      saveCurrentBillToHistory(true);
      const nextNo = getNextInvoiceNumber(formData.invoiceNo);
      setFormData({ customerName: "", invoiceNo: nextNo, date: getTodayDate() });
      setItems([{ id: Date.now(), itemDate: "", particulars: "", qty: "", rate: "" }]);
      setShowItemDate(false);
      setCustomerMobile("");
      setIsPaid(false);
      setActiveRowIndex(0);
      localStorage.removeItem("invoiceFormData");
      localStorage.removeItem("invoiceItems");
      localStorage.removeItem("invoiceShowItemDate");
      localStorage.removeItem("invoiceCustomerMobile");
      localStorage.removeItem("invoiceIsPaid");
    }
  };

  const grandTotal = items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.rate) || 0)), 0);
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const amountInWordsAuto = convertNumberToWords(grandTotal);

  // UPI Link Fix: Jar grandTotal > 0 asel tarch &am= add karaycha, nahitar UPI apps 0 amount la block kartat
  const upiLink = grandTotal > 0
    ? `upi://pay?pa=shekharkalekar22-1@okhdfcbank&pn=Shekhar%20Tanaji%20Kalekar&am=${grandTotal.toFixed(2)}&cu=INR`
    : `upi://pay?pa=shekharkalekar22-1@okhdfcbank&pn=Shekhar%20Tanaji%20Kalekar&cu=INR`;

  // Direct WhatsApp Message Function (Without saving contact)
  const sendDirectWhatsApp = () => {
    const cleanPhone = customerMobile.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("⚠️ Please enter a valid 10-digit Customer WhatsApp Number first!");
      return;
    }
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const origin = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
    const paymentWebUrl = grandTotal > 0 ? `${origin}?pay=1&am=${grandTotal.toFixed(2)}` : `${origin}?pay=1`;

    const custName = formData.customerName ? formData.customerName.split("\n")[0] : "Customer";
    const msg = `Hello *${custName}*,\n\nYour repairing bill from *SHEKHAR KALEKAR* is ready.\n*Invoice No:* ${formData.invoiceNo || "---"}\n*Total Amount:* ₹ ${grandTotal.toFixed(2)}\n*Status:* ${isPaid ? "PAID ✅" : "Payment Pending"}\n\n${!isPaid ? `*Click here to Pay via UPI (GPay/PhonePe):*\n${paymentWebUrl}\n\n` : ""}Thank you for your business! 🙏`;

    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // PDF madhe QR Code ani UPI ID var clickable HTTPS link basavnyasathi helper function
  const addPdfLinks = (pdf: jsPDF) => {
    if (!invoiceRef.current) return;
    const invoiceRect = invoiceRef.current.getBoundingClientRect();
    const scaleX = 210 / invoiceRect.width;
    const scaleY = 297 / invoiceRect.height;

    // PDF Viewers upi:// block kartat mhanun website chi https:// link dili ahe ji auto-redirect karel
    const origin = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
    const pdfPaymentUrl = grandTotal > 0
      ? `${origin}?pay=1&am=${grandTotal.toFixed(2)}`
      : `${origin}?pay=1`;

    if (qrLinkRef.current) {
      const qrRect = qrLinkRef.current.getBoundingClientRect();
      const x = (qrRect.left - invoiceRect.left) * scaleX;
      const y = (qrRect.top - invoiceRect.top) * scaleY;
      const w = qrRect.width * scaleX;
      const h = qrRect.height * scaleY;
      pdf.link(x, y, w, h, { url: pdfPaymentUrl });
    }

    if (upiTextLinkRef.current) {
      const upiRect = upiTextLinkRef.current.getBoundingClientRect();
      const x = (upiRect.left - invoiceRect.left) * scaleX;
      const y = (upiRect.top - invoiceRect.top) * scaleY;
      const w = upiRect.width * scaleX;
      const h = upiRect.height * scaleY;
      pdf.link(x, y, w, h, { url: pdfPaymentUrl });
    }
  };

  const downloadAsPdf = async () => {
    if (invoiceRef.current === null) return;
    try {
      saveCurrentBillToHistory(true);
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true, pixelRatio: 2 });
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
      addPdfLinks(pdf); // Adds clickable links inside PDF
      pdf.save(`Invoice_${formData.invoiceNo || "Bill"}.pdf`);
    } catch (err) { 
      console.error("Oops, something went wrong with PDF!", err); 
    }
  };

  // नवीन Function: PDF थेट Share करण्यासाठी 
  const sharePdfInvoice = async () => {
    if (invoiceRef.current === null) return;
    try {
      saveCurrentBillToHistory(true);
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true, pixelRatio: 2 });
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
      addPdfLinks(pdf); // Adds clickable links inside shared PDF

      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `Invoice_${formData.invoiceNo || "Bill"}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: 'Invoice from Shekhar Kalekar', files: [file] });
          return; 
        } catch (e) { console.log("Share cancelled by user"); }
      } else {
        alert("❌ Direct PDF sharing is not supported on this device. Downloading instead.");
        pdf.save(`Invoice_${formData.invoiceNo || "Bill"}.pdf`);
      }
    } catch (err) { console.error("Error sharing PDF:", err); }
  };

  const downloadAsImage = async () => {
    if (invoiceRef.current === null) return;
    try {
      saveCurrentBillToHistory(true);
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `Invoice_${formData.invoiceNo || "Bill"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error("Oops, something went wrong!", err); }
  };

  const shareInvoice = async () => {
    if (invoiceRef.current === null) return;
    try {
      saveCurrentBillToHistory(true);
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true, pixelRatio: 2 });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `Invoice_${formData.invoiceNo || "Bill"}.png`, { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: 'Invoice from Shekhar Kalekar', files: [file] });
          return; 
        } catch (e) { console.log("Share cancelled by user"); }
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
    } catch (err) { console.error("Error sharing invoice:", err); }
  };

  const handleActionSelection = (format: string) => {
    const type = actionType;
    setActionType(null); 

    setTimeout(async () => {
      if (format === "pdf") {
        if (type === "share") {
          // आता इथे थेट PDF Share होईल, alert नाही येणार 
          await sharePdfInvoice();
        } else {
          await downloadAsPdf(); 
        }
      } else {
        if (type === "download") {
          await downloadAsImage();
        } else if (type === "share") {
          await shareInvoice();
        }
      }
    }, 100);
  };

  if (!isMounted) return null; 

  // --- Auto-Redirect Screen for Customer Clicking from PDF ---
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center font-sans p-4 text-center">
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm border-t-4 border-green-600">
          <h2 className="text-xl font-black text-gray-800 mb-2 uppercase">Opening UPI App...</h2>
          <p className="text-sm text-gray-600 mb-6">Redirecting to GPay / PhonePe / Paytm for payment.</p>
          <a 
            href={redirectUpiUrl}
            className="w-full block bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold uppercase tracking-wider shadow-md transition-all"
          >
            Pay Now via UPI
          </a>
        </div>
      </div>
    );
  }

  // --- Security Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center font-sans p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm text-center border-t-4 border-blue-600 transition-all">
          <h2 className="text-2xl font-black text-gray-800 mb-2 uppercase">Security Check</h2>
          <p className="text-sm text-gray-500 mb-6">Please enter your PIN to access the billing app.</p>

          <input 
            type="password" 
            placeholder="Enter PIN" 
            className="w-full border-2 border-gray-300 p-3 rounded-lg text-center text-xl tracking-[0.5em] font-bold text-black focus:outline-none focus:border-blue-500 transition-all mb-4"
            value={securityPin}
            onChange={(e) => setSecurityPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            disabled={isChecking}
          />

          <button 
            onClick={handleLogin}
            disabled={isChecking}
            className={`w-full text-white py-3 rounded-lg font-bold uppercase tracking-wider shadow-md transition-all ${isChecking ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isChecking ? "Authenticating 🔓..." : "Unlock App"}
          </button>
        </div>
      </div>
    );
  }

  // --- Main Invoice App ---
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10 print:p-0 print:block flex flex-col items-center font-sans text-black relative print:min-h-0">

      {/* 🖨️ PRINTER ANIMATION GRAPHIC (Shows only when unlocking) */}
      {isAnimating && (
        <div className="w-full max-w-4xl flex flex-col items-center relative z-30 mb-[-10px] print:hidden">
          <div className="w-[85%] sm:w-[400px] bg-gray-800 rounded-t-2xl shadow-2xl flex flex-col items-center pt-5 pb-3 relative border-b-4 border-gray-900 border-x-4 border-t-4 border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl animate-bounce">🖨️</span>
              <span className="text-green-400 font-mono text-sm tracking-[0.2em] font-bold">PRINTING SYSTEM...</span>
            </div>
            {/* Blinking LEDs */}
            <div className="absolute right-5 top-5 flex gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
          {/* Printer Slot where paper comes out */}
          <div className="w-[75%] sm:w-[350px] h-3 bg-black rounded-b-xl shadow-inner z-30"></div>
        </div>
      )}

      {/* Animation Custom CSS with Blank Page Fix */}
      <style>{`
        @keyframes printPaperOut {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { transform: translateY(-100%); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-print-paper {
          animation: printPaperOut 2.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @media print {
          @page { size: A4; margin: 0; }
          html, body { height: 100vh; margin: 0 !important; padding: 0 !important; overflow: hidden; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* 
        FORM & BILL WRAPPER: 
        If animating, this div hides the overflow so the paper "slides out" from the printer slot.
      */}
      <div className={`w-full flex flex-col items-center ${isAnimating ? 'overflow-hidden z-20' : ''}`}>
        <div className={`w-full flex flex-col items-center ${isAnimating ? 'animate-print-paper' : ''}`}>

          {/* Input Form */}
          <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg mb-10 print:hidden border-t-4 border-blue-500 relative">
            <div className="flex flex-wrap justify-between items-center border-b pb-3 mb-6 gap-2">
              <h2 className="text-xl font-bold text-slate-800">Enter Invoice Details</h2>

              <div className="flex flex-wrap items-center gap-2">
                {/* Custom Recent Bills Dropdown with Individual Delete Option */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                    className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 px-3 py-2 rounded font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    📂 Recent Bills ({recentBills.length}) <span className="text-[10px]">▼</span>
                  </button>

                  {showRecentDropdown && (
                    <>
                      {/* Invisible backdrop to close dropdown when clicking outside */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowRecentDropdown(false)} 
                      />
                      <div className="absolute right-0 mt-1 w-72 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                        {recentBills.length === 0 ? (
                          <div className="p-3 text-xs text-gray-500 text-center font-medium">
                            No saved bills yet (Click Save Bill)
                          </div>
                        ) : (
                          <>
                            {recentBills.map((b) => (
                              <div
                                key={b.id}
                                onClick={() => loadBillFromHistory(String(b.id))}
                                className="flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 cursor-pointer text-xs group"
                              >
                                <span className="truncate font-semibold text-gray-800 pr-2 group-hover:text-blue-700">
                                  {b.label}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => deleteSingleBillFromHistory(b.id, e)}
                                  title="Delete this bill"
                                  className="text-red-500 hover:text-white hover:bg-red-500 px-2 py-0.5 rounded font-bold transition-colors shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={clearSavedHistory}
                              className="w-full text-center py-2 text-xs text-red-600 hover:bg-red-50 font-bold uppercase tracking-wider transition-colors"
                            >
                              🗑️ Clear All Bills
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <button 
                  onClick={() => saveCurrentBillToHistory(false)}
                  className="text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 font-bold transition-all uppercase tracking-wider"
                >
                  💾 Save Bill
                </button>
                <button 
                  onClick={lockApp}
                  className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 font-bold transition-all uppercase tracking-wider flex items-center"
                >
                  🔒 Lock
                </button>
                <button 
                  onClick={clearForm}
                  className="text-xs bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 font-bold transition-all uppercase tracking-wider"
                >
                  ↻ New Bill (+1)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Customer Name & Address (M/s.)</label>
                <textarea rows={2} className="w-full border p-2 rounded mt-1 text-black" value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Invoice No. / Date</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="No." className="w-1/2 border p-2 rounded mt-1 text-black font-bold" value={formData.invoiceNo} onChange={(e) => setFormData({...formData, invoiceNo: e.target.value})} />
                  <input type="date" className="w-1/2 border p-2 rounded mt-1 text-black" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Quick Particular Chips */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Particulars (Items)</label>
                <span className="text-[11px] text-gray-500">Tap a chip below to quick-add into active row:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {QUICK_ITEMS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickChipClick(chip)}
                    className="text-xs bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 border border-slate-300 px-2.5 py-1 rounded-full font-medium transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="flex gap-2 mb-2 items-start">
                  {showItemDate && (
                    <input type="date" className="w-32 border p-2 rounded text-black flex-shrink-0 text-xs" value={item.itemDate || ""} onChange={(e) => handleItemChange(index, 'itemDate', e.target.value)} />
                  )}
                  {/* Particulars Input changed to Textarea to support new lines */}
                  <textarea 
                    placeholder="Particulars (Press Enter for new line)" 
                    className={`flex-1 border p-2 rounded text-black min-w-0 resize-y ${activeRowIndex === index ? 'border-blue-500 ring-1 ring-blue-300' : ''}`} 
                    rows={2}
                    value={item.particulars} 
                    onFocus={() => setActiveRowIndex(index)}
                    onChange={(e) => handleItemChange(index, 'particulars', e.target.value)} 
                  />
                  <input type="number" placeholder="Qty" className="w-20 border p-2 rounded text-black flex-shrink-0" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value === "" ? "" : Number(e.target.value))} />
                  <input type="number" placeholder="Rate" className="w-28 sm:w-32 border p-2 rounded text-black flex-shrink-0" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value === "" ? "" : Number(e.target.value))} />
                  <button onClick={() => removeItem(index)} className="bg-red-500 text-white px-3 py-1 rounded font-bold hover:bg-red-700 flex items-center justify-center text-lg flex-shrink-0">-</button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button onClick={addItem} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200">+ Add Row</button>
                <button onClick={() => setShowItemDate(!showItemDate)} className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded font-bold hover:bg-purple-200 border border-purple-300">
                  {showItemDate ? "Hide Date Column" : "Show Date Column"}
                </button>

                {/* Paid Stamp Checkbox */}
                <label className="flex items-center gap-1.5 text-sm bg-green-50 text-green-800 px-3 py-1 rounded font-bold border border-green-300 cursor-pointer ml-auto">
                  <input 
                    type="checkbox" 
                    checked={isPaid} 
                    onChange={(e) => setIsPaid(e.target.checked)} 
                    className="w-4 h-4 accent-green-600 cursor-pointer"
                  />
                  ✅ Show PAID Stamp
                </label>
              </div>
            </div>

            {/* Amount in Words + Direct WhatsApp Bar */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Amount in Words (Auto Generated)</label>
                <input type="text" className="w-full border p-2 rounded mt-1 text-black bg-gray-100 font-bold" value={amountInWordsAuto} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer WhatsApp No. (Optional)</label>
                <div className="flex gap-2 mt-1">
                  <input 
                    type="tel" 
                    placeholder="10-digit Mobile" 
                    maxLength={10}
                    className="w-full border p-2 rounded text-black" 
                    value={customerMobile} 
                    onChange={(e) => setCustomerMobile(e.target.value)} 
                  />
                  <button
                    type="button"
                    onClick={sendDirectWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded font-bold text-xs uppercase tracking-wider shrink-0 shadow"
                    title="Send Bill Message & Payment Link directly on WhatsApp"
                  >
                    💬 WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Main Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              <button onClick={() => { saveCurrentBillToHistory(true); window.print(); }} className="flex-1 min-w-[150px] bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md uppercase tracking-wider flex justify-center items-center gap-2">
                🖨️ Print / PDF
              </button>
              <button onClick={() => setActionType('download')} className="flex-1 min-w-[150px] bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all shadow-md uppercase tracking-wider flex justify-center items-center gap-2">
                ⬇️ Download Bill
              </button>
              <button onClick={() => setActionType('share')} className="flex-1 min-w-[150px] bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-all shadow-md uppercase tracking-wider flex justify-center items-center gap-2">
                📤 Share Bill
              </button>
            </div>
          </div>

          {/* --- Popup Modal --- */}
          {actionType && (
            <div 
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print:hidden cursor-pointer"
              onClick={() => setActionType(null)}
            >
              <div 
                className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm text-center cursor-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-wide">
                  {actionType === 'download' ? "Download Bill" : "Share Bill"}
                </h3>
                <p className="text-sm text-gray-600 mb-6 font-medium">
                  Choose the format to {actionType === 'download' ? "download" : "share"}:
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleActionSelection("pdf")}
                    className="w-full bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-red-600 uppercase tracking-wider shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    📄 Direct PDF <span className="text-[10px] normal-case font-medium bg-red-700 px-2 py-0.5 rounded-full">(.pdf File)</span>
                  </button>
                  <button
                    onClick={() => handleActionSelection("image")}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-blue-600 uppercase tracking-wider shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    🖼️ Photo Image <span className="text-[10px] normal-case font-medium bg-blue-700 px-2 py-0.5 rounded-full">(.png File)</span>
                  </button>
                  <button
                    onClick={() => setActionType(null)}
                    className="w-full bg-gray-200 text-gray-800 py-2 mt-3 rounded-lg font-bold hover:bg-gray-300 uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- Actual Bill Template (Wrapped for Mobile Responsiveness) --- */}
          <div className="w-full overflow-x-auto print:overflow-visible flex justify-start md:justify-center pb-8 print:pb-0">
            <div className="min-w-[210mm] shrink-0">
              <div ref={invoiceRef} className="w-[210mm] min-h-[297mm] print:min-h-[290mm] print:h-[290mm] bg-white border border-gray-300 p-10 print:p-8 text-black shadow-2xl print:shadow-none print:m-0 print:border-none flex flex-col relative">
                <div className="text-right text-xs font-semibold uppercase">Mobile : 9702064094</div>
                <div className="text-center mb-6 border-b-2 border-black pb-4">
                  <h1 className="text-5xl font-black italic tracking-tighter text-gray-900 uppercase">SHEKHAR KALEKAR</h1>
                  <p className="text-md font-medium mt-1 uppercase tracking-wide">Repairing of All type of Printers LCD's & Laptops</p>
                  <p className="text-xs mt-1 text-gray-600 font-bold">7 / Arjun chawl, Tanajiwadi, T. P. Road, Bhandup West, Mumbai - 400078.</p>
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
                      <span className="font-bold">{formData.date ? formData.date.split('-').reverse().join('-') : "__-__-____"}</span>
                    </div>
                  </div>
                </div>

                <table className="w-full border-collapse border border-black flex-1 table-fixed">
                  <thead>
                    <tr className="border-b border-black bg-gray-50 font-bold uppercase text-sm">
                      {/* Sr. No. & Qty columns reduced in width */}
                      <th className="w-[6%] border-r border-black py-2">Sr. No.</th>
                      {showItemDate && (
                        <th className="w-[12%] border-r border-black py-2 text-center">Date</th>
                      )}
                      <th className="border-r border-black py-2 px-4">Particulars</th>
                      <th className="w-[8%] border-r border-black py-2">Qty</th>
                      <th className="w-[18%] py-2">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className="border-b border-black align-top h-10">
                        <td className="border-r border-black text-center py-2">{index + 1}.</td>
                        {showItemDate && (
                          <td className="border-r border-black text-center py-2 font-medium text-sm">
                            {item.itemDate ? item.itemDate.split('-').reverse().join('-') : ""}
                          </td>
                        )}
                        <td className="border-r border-black px-4 py-2 font-medium italic uppercase whitespace-pre-wrap break-words">{item.particulars}</td>
                        <td className="border-r border-black text-center py-2">{item.qty}</td>
                        <td className="text-center py-2 font-bold">{((Number(item.qty) || 0) * (Number(item.rate) || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="flex-1 border-b border-black">
                        <td className="border-r border-black min-h-[400px]"></td>
                        {showItemDate && <td className="border-r border-black"></td>}
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td></td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-black uppercase tracking-widest">
                      <td colSpan={showItemDate ? 3 : 2} className="border-r border-black text-center py-2">Total</td>
                      <td className="border-r border-black text-center">{totalQty}</td>
                      <td className="text-center py-2 text-lg font-black tracking-wider">₹ {grandTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Optional Rubber PAID Stamp */}
                {isPaid && (
                  <div className="absolute right-14 bottom-48 border-4 border-green-600 text-green-600 px-6 py-1.5 rounded-lg font-black text-3xl uppercase tracking-[0.25em] -rotate-12 opacity-80 pointer-events-none select-none shadow-sm">
                    PAID
                  </div>
                )}

                {/* Footer Area */}
                <div className="mt-8 flex justify-between items-end">

                  <div className="w-3/5">
                    <p className="text-xs font-bold uppercase underline">Amount in Words:</p>
                    <p className="text-sm italic font-semibold mt-1 text-slate-700 uppercase">{amountInWordsAuto}</p>

                    <div className="mt-4 flex gap-4 items-start">
                      <div className="flex flex-col items-center">
                        <a 
                          ref={qrLinkRef}
                          href={upiLink}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = upiLink;
                          }}
                          className="w-28 h-28 border border-black p-1 flex items-center justify-center bg-gray-50 cursor-pointer block"
                        >
                          <img src="/qr.png" alt="QR Code" className="max-w-full max-h-full object-contain block mx-auto pointer-events-none" />
                        </a>
                        <p className="text-[10px] font-bold mt-1 text-gray-600 uppercase tracking-tighter text-center">tap on qr to direct payment</p>
                      </div>

                      <div className="text-[12px] leading-snug text-gray-800">
                        <p className="font-bold underline uppercase mb-1 text-[13px]">Bank Details For Payment:</p>
                        <p><span className="font-bold">Name:</span> Shekhar Tanaji Kalekar</p>
                        <p><span className="font-bold">Bank:</span> Abhyudaya CO-OP. Bank LTD</p>
                        <p><span className="font-bold">A/C No:</span> 004011100080789</p>
                        <p><span className="font-bold">IFSC:</span> ABHY0065004</p>
                        <p>
                          <span className="font-bold">UPI ID:</span>{" "}
                          <a 
                            ref={upiTextLinkRef}
                            href={upiLink}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = upiLink;
                            }}
                            className="text-blue-600 underline hover:text-blue-800 transition-colors cursor-pointer"
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
          </div>
          {/* End of Bill */}

        </div>
      </div>
    </div>
  );
}