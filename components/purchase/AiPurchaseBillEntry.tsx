"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import {
  FaArrowLeft,
  FaCamera,
  FaFileUpload,
  FaMagic,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserPlus,
  FaBoxOpen,
  FaPlusCircle,
  FaTrash,
  FaSave,
  FaTimes,
  FaSync,
  FaReceipt,
  FaBuilding,
  FaFilePdf,
  FaChevronDown,
  FaChevronUp,
  FaShieldAlt,
  FaSlidersH,
} from "react-icons/fa";

interface BillItem {
  productId?: string;
  productCode?: string;
  productName: string;
  hsnCode: string;
  batchNo: string;
  mfgDate?: string;
  expDate: string;
  mrp: number;
  qty: number;
  freeQty: number;
  unit: string;
  rate: number;
  discountPercent: number;
  gstPercent: number;
  isNewProduct?: boolean;
  matchScore?: number;
}

interface CandidateParty {
  role?: string;
  name: string;
  gst?: string;
  phone?: string;
  address?: string;
  dlNo?: string;
}

interface SupplierMaster {
  id: string;
  code: string;
  name: string;
  gst: string;
  phone: string;
  city: string;
  address: string;
  isCreditor: boolean;
}

interface ProductMaster {
  id: string;
  code: string;
  name: string;
  hsn: string;
  purchaseRate: number;
  mrp: number;
  gstPercent: number;
  unit: string;
  companyName?: string;
}

interface ColumnConfig {
  hsn: boolean;
  pack: boolean;
  batch: boolean;
  mfgDate: boolean;
  expDate: boolean;
  mrp: boolean;
  freeQty: boolean;
  tradeDisc: boolean;
  gst: boolean;
  taxableAmt: boolean;
  gstAmt: boolean;
}

function computeSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = (str2 || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const set1 = new Set(s1.split(/\s+/));
  const set2 = new Set(s2.split(/\s+/));
  const common = new Set([...set1].filter((x) => set2.has(x)));
  return (2 * common.size) / (set1.size + set2.size);
}

export default function AiPurchaseBillEntry() {
  const router = useRouter();
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  // File & Camera states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Column Visibility Checkboxes
  const [showColSettings, setShowColSettings] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig>({
    hsn: true,
    pack: true,
    batch: true,
    mfgDate: true,
    expDate: true,
    mrp: true,
    freeQty: true,
    tradeDisc: true,
    gst: true,
    taxableAmt: true,
    gstAmt: true,
  });

  const toggleColumn = (key: keyof ColumnConfig) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Status & Progress
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [showRawInspector, setShowRawInspector] = useState(false);
  const [rawExtractedData, setRawExtractedData] = useState<any>(null);
  const [noApiKey, setNoApiKey] = useState(false);

  // AI Scan Review Modal & Candidate Parties (Pop-up to choose correct vendor)
  const [showAiReviewModal, setShowAiReviewModal] = useState(false);
  const [candidateParties, setCandidateParties] = useState<CandidateParty[]>([]);
  const [reviewSelectedPartyIdx, setReviewSelectedPartyIdx] = useState<number>(0);
  const [reviewTempVendorName, setReviewTempVendorName] = useState("");
  const [reviewTempVendorGst, setReviewTempVendorGst] = useState("");
  const [reviewTempVendorPhone, setReviewTempVendorPhone] = useState("");
  const [reviewTempVendorAddress, setReviewTempVendorAddress] = useState("");
  const [reviewTempVendorDlNo, setReviewTempVendorDlNo] = useState("");
  const [reviewTempInvoiceNo, setReviewTempInvoiceNo] = useState("");
  const [reviewTempBillDate, setReviewTempBillDate] = useState("");
  const [reviewTempDueDate, setReviewTempDueDate] = useState("");
  const [reviewTempTaxType, setReviewTempTaxType] = useState<"Interstate" | "Intrastate">("Interstate");
  const [reviewTempSupplierId, setReviewTempSupplierId] = useState("");

  // Master Data
  const [suppliersList, setSuppliersList] = useState<SupplierMaster[]>([]);
  const [productsList, setProductsList] = useState<ProductMaster[]>([]);

  // Form State
  const [billNumberCustom, setBillNumberCustom] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [billDate, setBillDate] = useState("2026-06-20");
  const [dueDate, setDueDate] = useState("2026-07-20");

  // Supplier details
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [extractedVendorName, setExtractedVendorName] = useState("");
  const [matchedDbVendorName, setMatchedDbVendorName] = useState("");
  const [vendorGst, setVendorGst] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorDlNo, setVendorDlNo] = useState("");
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [supplierMatchScore, setSupplierMatchScore] = useState<number>(0);
  const [registeringSupplier, setRegisteringSupplier] = useState(false);

  // Tax Type (Interstate IGST vs Intrastate CGST+SGST)
  const [taxType, setTaxType] = useState<"Interstate" | "Intrastate">("Interstate");

  // Line Items
  const [items, setItems] = useState<BillItem[]>([]);
  const [remarks, setRemarks] = useState("Parsed via High-Precision Pharma Invoice Extractor");
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Success Modal
  const [successModal, setSuccessModal] = useState(false);
  const [createdBillNo, setCreatedBillNo] = useState("");

  // Fetch Master Data
  const fetchMasters = useCallback(async () => {
    setLoadingMasters(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

      const res = await fetch(`/api/purchase/master-options?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSuppliersList(json.suppliers || []);
          setProductsList(json.products || []);
        }
      }
    } catch (err) {
      console.error("Master Options Error:", err);
    } finally {
      setLoadingMasters(false);
    }
  }, [selectedCompany]);

  // Fetch Next Voucher Number VCN
  const fetchNextVcn = useCallback(async () => {
    try {
      const res = await fetch("/api/purchase/invoice?action=nextNumber");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.nextVcn) {
          setBillNumberCustom(json.nextVcn);
        }
      }
    } catch (err) {
      console.error("VCN Fetch Error:", err);
    }
  }, []);

  useEffect(() => {
    fetchMasters();
    fetchNextVcn();
  }, [fetchMasters, fetchNextVcn]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  // Drag & Drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  // Camera handlers
  const startCamera = async () => {
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Unable to access camera. Please allow permissions or upload a file.");
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], `scanned_bill_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setSelectedFile(capturedFile);
            setPreviewUrl(URL.createObjectURL(capturedFile));
          }
        }, "image/jpeg");
      }
    }
    stopCamera();
  };

  // High Precision Supplier Matching
  const matchSupplier = (parsedVendorName: string, parsedGst: string, currentSuppliers: SupplierMaster[]) => {
    const cleanGst = (parsedGst || "").trim().toUpperCase();
    const cleanName = (parsedVendorName || "").trim().toUpperCase();

    setExtractedVendorName(cleanName);

    let matched = currentSuppliers.find(
      (s) => cleanGst && s.gst && s.gst.toUpperCase() === cleanGst
    );

    let score = 0;
    if (matched) {
      score = 1.0;
    } else {
      let bestScore = 0;
      currentSuppliers.forEach((s) => {
        const sim = computeSimilarity(cleanName, s.name);
        if (sim > bestScore) {
          bestScore = sim;
          matched = s;
        }
      });
      if (bestScore >= 0.6) {
        score = bestScore;
      } else {
        matched = undefined;
        score = 0;
      }
    }

    if (matched) {
      setSelectedSupplierId(matched.id);
      setMatchedDbVendorName(matched.name);
      setVendorName(cleanName || matched.name);
      setVendorGst(cleanGst || matched.gst || "");
      setVendorPhone(matched.phone || "");
      setVendorAddress(matched.address || "");
      setIsNewSupplier(false);
      setSupplierMatchScore(score);
    } else {
      setSelectedSupplierId("");
      setMatchedDbVendorName("");
      setVendorName(cleanName);
      setVendorGst(cleanGst);
      setVendorPhone("");
      setVendorAddress("");
      setIsNewSupplier(true);
      setSupplierMatchScore(0);
    }
  };

  // High Precision Product Matching
  const matchProducts = (parsedItems: any[], currentProducts: ProductMaster[]): BillItem[] => {
    return parsedItems.map((raw) => {
      const rawName = String(raw.productName || "").trim().toUpperCase();

      let matchedProd: ProductMaster | null = null;
      let bestScore = 0;

      for (const p of currentProducts) {
        const sim = computeSimilarity(rawName, p.name);
        if (sim > bestScore) {
          bestScore = sim;
          matchedProd = p;
        }
      }

      if (matchedProd && bestScore >= 0.4) {
        const p: ProductMaster = matchedProd;
        return {
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          hsnCode: raw.hsnCode || p.hsn || "3004",
          batchNo: raw.batchNo || "BATCH-01",
          mfgDate: raw.mfgDate || "",
          expDate: raw.expDate || "2028-02",
          mrp: Number(raw.mrp || p.mrp || 0),
          qty: Number(raw.qty || 1),
          freeQty: Number(raw.freeQty || 0),
          unit: raw.unit || p.unit || "Box",
          rate: Number(raw.rate || p.purchaseRate || 0),
          discountPercent: Number(raw.discountPercent || 0),
          gstPercent: Number(raw.gstPercent || p.gstPercent || 5),
          isNewProduct: false,
          matchScore: bestScore,
        };
      }

      return {
        productName: rawName || "MEDICINE ITEM",
        hsnCode: raw.hsnCode || "3004",
        batchNo: raw.batchNo || "BATCH-01",
        mfgDate: raw.mfgDate || "",
        expDate: raw.expDate || "2028-02",
        mrp: Number(raw.mrp || 0),
        qty: Number(raw.qty || 1),
        freeQty: Number(raw.freeQty || 0),
        unit: raw.unit || "Box",
        rate: Number(raw.rate || 0),
        discountPercent: Number(raw.discountPercent || 0),
        gstPercent: Number(raw.gstPercent || 5),
        isNewProduct: true,
        matchScore: 0,
      };
    });
  };

  const [parseError, setParseError] = useState<string | null>(null);

  // Switch candidate party inside review popup or form
  const selectCandidateParty = (party: CandidateParty, idx: number) => {
    setReviewSelectedPartyIdx(idx);
    setReviewTempVendorName(party.name || "");
    setReviewTempVendorGst(party.gst || "");
    setReviewTempVendorPhone(party.phone || "");
    setReviewTempVendorAddress(party.address || "");
    setReviewTempVendorDlNo(party.dlNo || "");

    const cleanGst = (party.gst || "").trim().toUpperCase();
    const cleanName = (party.name || "").trim().toUpperCase();
    let matched = suppliersList.find(
      (s) => cleanGst && s.gst && s.gst.toUpperCase() === cleanGst
    );
    if (!matched) {
      let bestScore = 0;
      suppliersList.forEach((s) => {
        const sim = computeSimilarity(cleanName, s.name);
        if (sim > bestScore) {
          bestScore = sim;
          matched = s;
        }
      });
      if (bestScore < 0.6) matched = undefined;
    }
    if (matched) {
      setReviewTempSupplierId(matched.id);
    } else {
      setReviewTempSupplierId("");
    }

    const vendorStateCode = (party.gst || "").slice(0, 2);
    const companyStateCode = (selectedCompany?.gstNo || "03").slice(0, 2);
    if (vendorStateCode && companyStateCode && vendorStateCode === companyStateCode) {
      setReviewTempTaxType("Intrastate");
    } else if (vendorStateCode) {
      setReviewTempTaxType("Interstate");
    }
  };

  // Apply all data from AI Review modal into the form
  const handleApplyReviewedData = () => {
    setVendorName(reviewTempVendorName);
    setVendorGst(reviewTempVendorGst);
    setVendorPhone(reviewTempVendorPhone);
    setVendorAddress(reviewTempVendorAddress);
    setVendorDlNo(reviewTempVendorDlNo);

    if (reviewTempInvoiceNo) setSupplierInvoiceNo(reviewTempInvoiceNo);
    if (reviewTempBillDate) setBillDate(reviewTempBillDate);
    if (reviewTempDueDate) setDueDate(reviewTempDueDate);
    setTaxType(reviewTempTaxType);

    if (reviewTempSupplierId) {
      setSelectedSupplierId(reviewTempSupplierId);
      const s = suppliersList.find((sup) => sup.id === reviewTempSupplierId);
      if (s) {
        setMatchedDbVendorName(s.name);
        setIsNewSupplier(false);
        setSupplierMatchScore(1.0);
      }
    } else {
      matchSupplier(reviewTempVendorName, reviewTempVendorGst, suppliersList);
    }

    setShowAiReviewModal(false);
  };

  // Trigger Document Extraction
  const handleParseDocument = async () => {
    if (!selectedFile) {
      alert("Please upload a purchase bill document or click a photo first.");
      return;
    }

    setParsing(true);
    setParseError(null);
    setParseProgress("Uploading document & running AI Multimodal extraction...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/parse-bill-document", {
        method: "POST",
        body: formData,
      });

      setParseProgress("Parsing header, items & auto-matching database records...");

      const json = await res.json().catch(() => null);

      if (res.ok && json) {
        if (json.noApiKey) {
          setNoApiKey(true);
          setParseError("AI Vision Scanner license key is not configured in server environment.");
          alert("AI Vision Scanner license key is not configured. Please configure your key in .env file.");
          return;
        }

        if (json.success && json.data) {
          const data = json.data;
          setRawExtractedData(data);
          setNoApiKey(false);

          // Build candidate parties list from scan results
          let parties: CandidateParty[] = [];
          if (data.candidateParties && Array.isArray(data.candidateParties) && data.candidateParties.length > 0) {
            parties = data.candidateParties;
          } else {
            if (data.vendorName) {
              parties.push({
                role: "Seller / Header",
                name: data.vendorName,
                gst: data.vendorGst || "",
                phone: data.vendorPhone || "",
                address: data.vendorAddress || "",
                dlNo: data.vendorDlNo || "",
              });
            }
            if (data.buyerName && data.buyerName.toLowerCase() !== (data.vendorName || "").toLowerCase()) {
              parties.push({
                role: "Buyer / M/s Party",
                name: data.buyerName,
                gst: data.buyerGst || "",
                phone: data.buyerPhone || "",
                address: data.buyerAddress || "",
                dlNo: data.buyerDlNo || "",
              });
            }
          }
          setCandidateParties(parties);

          // Primary party (usually the Seller / Header at index 0)
          const primaryParty = parties[0] || {
            name: data.vendorName || "",
            gst: data.vendorGst || "",
            phone: data.vendorPhone || "",
            address: data.vendorAddress || "",
            dlNo: data.vendorDlNo || "",
          };

          setReviewSelectedPartyIdx(0);
          setReviewTempVendorName(primaryParty.name || data.vendorName || "");
          setReviewTempVendorGst(primaryParty.gst || data.vendorGst || "");
          setReviewTempVendorPhone(primaryParty.phone || data.vendorPhone || "");
          setReviewTempVendorAddress(primaryParty.address || data.vendorAddress || "");
          setReviewTempVendorDlNo(primaryParty.dlNo || data.vendorDlNo || "");

          setReviewTempInvoiceNo(data.supplierInvoiceNo || "");
          setReviewTempBillDate(data.billDate || new Date().toISOString().slice(0, 10));
          setReviewTempDueDate(data.dueDate || "");

          if (data.supplierInvoiceNo) setSupplierInvoiceNo(data.supplierInvoiceNo);
          if (data.billDate) setBillDate(data.billDate);
          if (data.dueDate) setDueDate(data.dueDate);
          if (primaryParty.dlNo || data.vendorDlNo) setVendorDlNo(primaryParty.dlNo || data.vendorDlNo || "");

          // Match supplier in DB for default selected party
          matchSupplier(primaryParty.name || data.vendorName, primaryParty.gst || data.vendorGst, suppliersList);

          // Items match
          const hasItems = data.items && Array.isArray(data.items) && data.items.length > 0;
          if (hasItems) {
            const mapped = matchProducts(data.items, productsList);
            setItems(mapped);
          } else {
            alert("⚠️ AI processed the bill, but no items could be detected. Please check if the document is clear.");
          }

          // Auto-detect tax type based on vendor GSTIN state code
          const vendorStateCode = (primaryParty.gst || data.vendorGst || "").slice(0, 2);
          const companyStateCode = (selectedCompany?.gstNo || "03").slice(0, 2);
          const autoTaxType = (vendorStateCode && companyStateCode && vendorStateCode === companyStateCode) ? "Intrastate" : "Interstate";
          setTaxType(autoTaxType);
          setReviewTempTaxType(autoTaxType);

          if (json.source) {
            setRemarks(`Parsed via ${json.source}`);
          }

          // Automatically open the AI Review & Supplier Selection Popup
          setShowAiReviewModal(true);
        } else {
          const errMsg = json.message || "Failed to extract purchase bill data.";
          setParseError(errMsg);
          alert(`❌ Extraction Error: ${errMsg}`);
        }
      } else {
        const errMsg = json?.message || `Server Error ${res.status}: ${res.statusText}`;
        setParseError(errMsg);
        alert(`❌ Error from Server: ${errMsg}`);
      }
    } catch (err: any) {
      console.error("Parse error:", err);
      const errMsg = err?.message || "Error occurred while extracting document.";
      setParseError(errMsg);
      alert(`❌ Network/Processing Error: ${errMsg}`);
    } finally {
      setParsing(false);
      setParseProgress("");
    }
  };

  // Quick Register Supplier
  const handleQuickRegisterSupplier = async () => {
    if (!vendorName.trim()) {
      alert("Please enter Supplier Name.");
      return;
    }

    setRegisteringSupplier(true);
    try {
      const res = await fetch("/api/purchase/quick-create-supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: vendorName,
          gst: vendorGst,
          phone: vendorPhone,
          address: vendorAddress,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.supplier) {
          setSuppliersList((prev) => [json.supplier, ...prev]);
          setSelectedSupplierId(json.supplier.id);
          setIsNewSupplier(false);
          setSupplierMatchScore(1.0);
          alert(`Supplier "${json.supplier.name}" registered successfully!`);
        } else {
          alert(json.message || "Failed to register supplier.");
        }
      }
    } catch (err) {
      console.error("Register supplier error:", err);
    } finally {
      setRegisteringSupplier(false);
    }
  };

  // Row Manipulation
  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productName: "",
        hsnCode: "3004",
        batchNo: "BATCH-01",
        mfgDate: "",
        expDate: "2028-02",
        mrp: 0,
        qty: 1,
        freeQty: 0,
        unit: "Box",
        rate: 0,
        discountPercent: 0,
        gstPercent: 5,
        isNewProduct: true,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Computations
  const computedItems = items.map((it) => {
    const qty = Number(it.qty || 0);
    const rate = Number(it.rate || 0);
    const discPercent = Number(it.discountPercent || 0);
    const gstPercent = Number(it.gstPercent || 0);

    const gross = qty * rate;
    const discAmt = gross * (discPercent / 100);
    const taxableAmount = Math.max(0, gross - discAmt);
    const gstAmount = taxableAmount * (gstPercent / 100);
    const total = taxableAmount + gstAmount;

    return { ...it, taxableAmount, gstAmount, total };
  });

  const subtotalTaxable = computedItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalTaxAmount = computedItems.reduce((sum, item) => sum + item.gstAmount, 0);
  const totalDiscount = computedItems.reduce((sum, item) => {
    const gross = item.qty * item.rate;
    return sum + gross * (item.discountPercent / 100);
  }, 0);

  const cgst = taxType === "Intrastate" ? totalTaxAmount / 2 : 0;
  const sgst = taxType === "Intrastate" ? totalTaxAmount / 2 : 0;
  const igst = taxType === "Interstate" ? totalTaxAmount : 0;

  const rawNetTotal = subtotalTaxable + totalTaxAmount;
  const netAmount = Math.round(rawNetTotal);
  const roundOff = Number((netAmount - rawNetTotal).toFixed(2));
  const balanceAmount = Math.max(0, netAmount - paidAmount);

  // Save Purchase Bill
  const handleSavePurchaseBill = async () => {
    if (!vendorName.trim()) {
      alert("Please specify a Vendor/Supplier Name.");
      return;
    }
    if (computedItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    setSaving(true);
    try {
      let finalVendorId = selectedSupplierId;
      if (isNewSupplier && !selectedSupplierId) {
        const supRes = await fetch("/api/purchase/quick-create-supplier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: vendorName,
            gst: vendorGst,
            phone: vendorPhone,
            address: vendorAddress,
          }),
        });
        if (supRes.ok) {
          const supJson = await supRes.json();
          if (supJson.success && supJson.supplier) {
            finalVendorId = supJson.supplier.id;
          }
        }
      }

      const finalItems = await Promise.all(
        computedItems.map(async (it) => {
          if (it.isNewProduct && !it.productId) {
            try {
              const prodRes = await fetch("/api/purchase/quick-create-product", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: it.productName,
                  hsn: it.hsnCode,
                  purchaseRate: it.rate,
                  mrp: it.mrp,
                  gstPercent: it.gstPercent,
                  unit: it.unit,
                }),
              });
              if (prodRes.ok) {
                const prodJson = await prodRes.json();
                if (prodJson.success && prodJson.product) {
                  return {
                    ...it,
                    productId: prodJson.product.id,
                    productCode: prodJson.product.code,
                  };
                }
              }
            } catch (err) {
              console.error("Auto product creation error:", err);
            }
          }
          return it;
        })
      );

      const payload = {
        billNumber: billNumberCustom || `PUR-${Date.now()}`,
        supplierInvoiceNo,
        billDate,
        dueDate,
        companyId: selectedCompany?._id || "",
        companyCode: selectedCompany?.companyCode || "",
        fyId: selectedFY?._id || "",
        fyCode: selectedFY?.fyCode || "",
        vendorId: finalVendorId,
        vendorName,
        vendorGst,
        vendorPhone,
        vendorAddress,
        items: finalItems,
        subtotal: subtotalTaxable,
        totalDiscount,
        cgst,
        sgst,
        igst,
        totalTax: totalTaxAmount,
        roundOff,
        netAmount,
        paidAmount,
        balanceAmount,
        paymentStatus: paidAmount >= netAmount ? "Paid" : paidAmount > 0 ? "Partial" : "Pending",
        remarks,
      };

      const saveRes = await fetch("/api/purchase/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const saveJson = await saveRes.json().catch(() => null);
      if (saveRes.ok && saveJson?.success) {
        setCreatedBillNo(saveJson.bill?.billNumber || payload.billNumber);
        setSuccessModal(true);
      } else {
        alert(saveJson?.message || "Failed to save Purchase Bill.");
      }
    } catch (err) {
      console.error("Save Purchase Bill error:", err);
      alert("Error occurred while saving purchase bill.");
    } finally {
      setSaving(false);
    }
  };

  const supplierOptions: OptionItem[] = suppliersList.map((s) => ({
    value: s.id,
    label: `${s.name} ${s.gst ? `(${s.gst})` : ""}`,
  }));

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-3 sm:p-5 md:p-8 text-slate-800 dark:text-slate-100 font-sans transition-colors">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 md:p-8 rounded-3xl shadow-xl shadow-amber-500/10 border border-white/20 dark:border-slate-800 mb-6 text-white">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/purchase/invoice"
              className="p-3 rounded-2xl bg-white/20 dark:bg-slate-800/80 hover:bg-white/30 backdrop-blur-md text-white transition-all shadow-sm group"
            >
              <FaArrowLeft className="text-base group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-200 dark:text-amber-400 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 dark:bg-amber-950/60 backdrop-blur-md border border-white/20 text-[10px] flex items-center gap-1">
                  <FaMagic className="text-amber-300 animate-spin" /> AI Vision Engine v2.5
                </span>
                <span>• Purchase Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                Smart AI Purchase Bill Scan & Auto-Fill
              </h1>
              <p className="text-xs sm:text-sm text-white/80 dark:text-slate-300 mt-1 max-w-2xl">
                Scan MabsolCRM ERP, Tally, Busy, Goods Receipt Notes or PDF bills. Extracts line items, matches suppliers, and posts purchase records automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
            {(rawExtractedData || candidateParties.length > 0) && (
              <button
                type="button"
                onClick={() => setShowAiReviewModal(true)}
                className="px-4 py-2.5 text-xs font-black rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-amber-950/20"
              >
                <FaMagic /> 🔍 Review Extracted Data
              </button>
            )}
            <button
              onClick={() => setShowColSettings(!showColSettings)}
              className="px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/20 hover:bg-white/30 dark:bg-slate-800 dark:hover:bg-slate-700 backdrop-blur-md text-white border border-white/20 transition-all flex items-center gap-2 shadow-sm"
            >
              <FaSlidersH /> Customize Columns ⚙️
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setItems([]);
                setVendorName("");
                setVendorGst("");
                setCandidateParties([]);
                setRawExtractedData(null);
              }}
              className="px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/20 hover:bg-white/30 dark:bg-slate-800 dark:hover:bg-slate-700 backdrop-blur-md text-white border border-white/20 transition-all flex items-center gap-2 shadow-sm"
            >
              <FaSync /> Reset Form
            </button>
          </div>
        </div>

        {/* Column Customization Drawer */}
        {showColSettings && (
          <div className="mt-6 p-4 bg-white/10 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700 text-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex justify-between items-center text-white">
              <span className="font-bold uppercase tracking-wider flex items-center gap-2">
                <FaSlidersH /> Toggle Table Column Visibility (S.N, HSN, Pack, Batch, Mfg, Exp, MRP, Rate, Dis %, IGST %, Taxable, Total)
              </span>
              <button
                onClick={() => setShowColSettings(false)}
                className="text-xs text-white/80 hover:text-white font-bold"
              >
                Close ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
              {[
                { key: "hsn", label: "HSN Code" },
                { key: "pack", label: "Pack / Unit" },
                { key: "batch", label: "Batch No" },
                { key: "mfgDate", label: "Mfg Date" },
                { key: "expDate", label: "Expiry Date" },
                { key: "mrp", label: "MRP (₹)" },
                { key: "freeQty", label: "Free Qty" },
                { key: "tradeDisc", label: "Trade Disc %" },
                { key: "gst", label: "GST %" },
                { key: "taxableAmt", label: "Taxable Value" },
                { key: "gstAmt", label: "GST Amount" },
              ].map((col) => {
                const active = columns[col.key as keyof ColumnConfig];
                return (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-white bg-white/10 dark:bg-slate-900/80 p-2 rounded-xl border border-white/20"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleColumn(col.key as keyof ColumnConfig)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span>{col.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* NO API KEY BANNER */}
      {noApiKey && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex gap-4">
          <div className="text-amber-500 text-2xl mt-1">⚠️</div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">
              AI Vision Scanner Key Not Configured — Automatic Bill Extraction Unavailable
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
              To automatically extract invoice data from images and PDFs, please configure your AI Scanner API key in your server environment.
            </p>
            <div className="bg-white dark:bg-amber-950/60 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1 border border-amber-100 dark:border-amber-800">
              <p className="font-bold text-amber-800 dark:text-amber-300 mb-2">📋 Configuration Steps:</p>
              <p>1️⃣ Obtain an AI Vision API license key.</p>
              <p>2️⃣ Add it to your project root <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env</code> file:</p>
              <pre className="bg-slate-100 dark:bg-slate-900 rounded-lg p-2 mt-1 text-green-700 dark:text-green-400 font-mono text-[11px]">AI_API_KEY=your_api_key_here</pre>
              <p>3️⃣ Restart your development server: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">npm run dev</code></p>
            </div>
          </div>
        </div>
      )}

      {/* PARSE ERROR BANNER */}
      {parseError && !noApiKey && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start justify-between gap-3 text-red-700 dark:text-red-300">
          <div className="flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div>
              <h4 className="font-bold text-sm">AI Bill Extraction Error</h4>
              <p className="text-xs font-mono mt-1 text-red-600 dark:text-red-400">{parseError}</p>
            </div>
          </div>
          <button
            onClick={() => setParseError(null)}
            className="text-xs font-bold px-2 py-1 bg-red-100 dark:bg-red-900 rounded-lg hover:bg-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Responsive 12 Columns Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Upload, Camera & Supplier Matching (4 Cols on XL) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Card 1: Upload / Camera Dropzone */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-extrabold">
                  1
                </span>
                Upload or Capture Invoice
              </h2>
            </div>

            {/* Dropzone Container */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-amber-300 dark:border-amber-700/60 hover:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 rounded-3xl p-6 text-center transition-all cursor-pointer relative overflow-hidden group shadow-inner"
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />

              {previewUrl ? (
                <div className="relative group/prev">
                  {selectedFile?.type === "application/pdf" || selectedFile?.name.toLowerCase().endsWith(".pdf") ? (
                    <div className="space-y-2">
                      <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-inner flex flex-col">
                        <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1.5 text-red-600 dark:text-red-400 truncate max-w-[200px]">
                            <FaFilePdf className="text-sm shrink-0" /> {selectedFile.name}
                          </span>
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open PDF ↗
                          </a>
                        </div>
                        <iframe
                          src={previewUrl}
                          title="PDF Invoice Preview"
                          className="w-full flex-1 border-0"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                        <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                        <span className="text-emerald-600 font-bold">✓ PDF Ready for Smart AI Extraction</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <img
                        src={previewUrl}
                        alt="Purchase Bill Preview"
                        className="max-h-56 mx-auto rounded-2xl object-contain shadow-lg border border-slate-200 dark:border-slate-700"
                      />
                      <div className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {selectedFile?.name} ({(selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0)} KB)
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedFile ? (
                <div className="py-8 flex flex-col items-center">
                  <FaFilePdf className="text-5xl text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    ✓ Document Ready ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                    <FaFileUpload />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Drag & Drop Purchase Bill / PDF
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports MabsolCRM ERP, Busy, Tally, PDF Invoices & Camera Photos
                  </p>
                </div>
              )}
            </div>

            {/* Upload Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={startCamera}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <FaCamera className="text-amber-400" /> Click Photo
              </button>

              <button
                onClick={handleParseDocument}
                disabled={!selectedFile || parsing}
                className={`w-full py-3 px-4 rounded-2xl text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg ${
                  !selectedFile || parsing
                    ? "bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500 shadow-none"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25"
                }`}
              >
                {parsing ? (
                  <>
                    <FaSync className="animate-spin text-sm" /> Extracting...
                  </>
                ) : (
                  <>
                    <FaMagic className="text-sm" /> Auto Extract Data
                  </>
                )}
              </button>
            </div>

            {parseProgress && (
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2.5 animate-pulse font-medium">
                <FaMagic className="text-amber-500 shrink-0" />
                <span>{parseProgress}</span>
              </div>
            )}
          </div>

          {/* Card 2: Supplier Detection & Party Matching */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-extrabold">
                  2
                </span>
                Supplier Detection & Matching
              </h2>
              {candidateParties.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAiReviewModal(true)}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 rounded-xl text-[11px] font-extrabold transition-colors flex items-center gap-1 shadow-sm"
                >
                  <FaMagic /> Select Party
                </button>
              )}
            </div>

            {/* Match Status Badge */}
            {vendorName && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all ${
                  isNewSupplier
                    ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isNewSupplier ? (
                    <FaExclamationTriangle className="text-amber-500 text-base shrink-0" />
                  ) : (
                    <FaCheckCircle className="text-emerald-500 text-base shrink-0" />
                  )}
                  <div>
                    <div>{isNewSupplier ? "New Supplier Detected" : "Matched Existing Supplier"}</div>
                    {!isNewSupplier && (
                      <div className="text-[10px] opacity-80 font-normal">
                        Match Confidence: {Math.round(supplierMatchScore * 100)}%
                      </div>
                    )}
                  </div>
                </div>

                {isNewSupplier && (
                  <button
                    onClick={handleQuickRegisterSupplier}
                    disabled={registeringSupplier}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 shadow-sm shrink-0"
                  >
                    <FaUserPlus /> {registeringSupplier ? "Saving..." : "Register Party"}
                  </button>
                )}
              </div>
            )}

            {/* Candidate Parties Detected on Bill (1-Click Switch) */}
            {candidateParties.length > 0 && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl text-xs space-y-2 border border-amber-200/80 dark:border-amber-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FaBuilding /> Detected Parties on Bill ({candidateParties.length})
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">Click to switch:</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {candidateParties.map((p, idx) => {
                    const isSelected =
                      vendorName && p.name && vendorName.trim().toUpperCase() === p.name.trim().toUpperCase();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setVendorName(p.name);
                          if (p.gst) setVendorGst(p.gst);
                          if (p.phone) setVendorPhone(p.phone);
                          if (p.address) setVendorAddress(p.address);
                          if (p.dlNo) setVendorDlNo(p.dlNo);
                          matchSupplier(p.name, p.gst || "", suppliersList);
                          const vendorStateCode = (p.gst || "").slice(0, 2);
                          const companyStateCode = (selectedCompany?.gstNo || "03").slice(0, 2);
                          if (vendorStateCode && companyStateCode && vendorStateCode === companyStateCode) {
                            setTaxType("Intrastate");
                          } else if (vendorStateCode) {
                            setTaxType("Interstate");
                          }
                        }}
                        className={`p-2.5 rounded-xl text-left text-xs font-bold border transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/40"
                            : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                        }`}
                      >
                        <div className="space-y-0.5 truncate flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-extrabold ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                              {p.role || `Party #${idx + 1}`}
                            </span>
                            <span className="font-extrabold truncate">{p.name}</span>
                          </div>
                          {p.gst && <div className={`text-[10px] font-mono ${isSelected ? "text-white/90" : "text-slate-500 dark:text-slate-400"}`}>GSTIN: {p.gst}</div>}
                        </div>
                        {isSelected && <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded font-black shrink-0">Selected</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Vendor Name Selector: Paper Name vs DB Matched Name */}
            {extractedVendorName && matchedDbVendorName && extractedVendorName !== matchedDbVendorName && (
              <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Select Vendor Name Option:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setVendorName(extractedVendorName)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      vendorName === extractedVendorName
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Paper Name: {extractedVendorName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendorName(matchedDbVendorName)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      vendorName === matchedDbVendorName
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    DB Name: {matchedDbVendorName}
                  </button>
                </div>
              </div>
            )}

            {/* Select Supplier Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Select Supplier from Database:
              </label>
              <SearchableSelect
                options={supplierOptions}
                value={selectedSupplierId}
                onChange={(val) => {
                  setSelectedSupplierId(val);
                  const matched = suppliersList.find((s) => s.id === val);
                  if (matched) {
                    setVendorName(matched.name);
                    setVendorGst(matched.gst);
                    setVendorPhone(matched.phone);
                    setVendorAddress(matched.address);
                    setIsNewSupplier(false);
                    setSupplierMatchScore(1.0);
                  }
                }}
                placeholder="Search Supplier Name / GST..."
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. WHITE EAGLE LABORATORIES"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    GSTIN No
                  </label>
                  <input
                    type="text"
                    value={vendorGst}
                    onChange={(e) => setVendorGst(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none uppercase font-mono text-slate-900 dark:text-white"
                    placeholder="15-digit GSTIN"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Drug License No
                  </label>
                  <input
                    type="text"
                    value={vendorDlNo}
                    onChange={(e) => setVendorDlNo(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                    placeholder="e.g. 1395-B, 1396-OSP"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Invoice Header & Line Items Table (8 Cols on XL) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Card 3: Invoice Header & Tax Controls */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-extrabold">
                  3
                </span>
                Invoice Header & Tax Calculation Mode
              </h2>

              {/* Tax Type Interactive Toggle Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 self-stretch sm:self-auto justify-center">
                <button
                  type="button"
                  onClick={() => setTaxType("Interstate")}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                    taxType === "Interstate"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Interstate (IGST)
                </button>
                <button
                  type="button"
                  onClick={() => setTaxType("Intrastate")}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                    taxType === "Intrastate"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Intrastate (CGST + SGST)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Voucher / VCN *
                </label>
                <input
                  type="text"
                  value={billNumberCustom}
                  onChange={(e) => setBillNumberCustom(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Supplier Inv No *
                </label>
                <input
                  type="text"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. P000030"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Bill Date *
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Extracted Line Items Table */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-extrabold">
                  4
                </span>
                Extracted Line Items ({computedItems.length})
              </h2>

              <button
                onClick={handleAddItem}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <FaPlusCircle /> Add Item
              </button>
            </div>

            {/* Responsive Table Wrapper */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 max-h-[460px] scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[1250px] border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    <th className="py-3 px-3.5 min-w-[280px]">Product / Medicine</th>
                    {columns.hsn && <th className="py-3 px-2 min-w-[85px]">HSN</th>}
                    {columns.pack && <th className="py-3 px-2 min-w-[80px]">Pack</th>}
                    {columns.batch && <th className="py-3 px-2 min-w-[95px]">Batch</th>}
                    {columns.mfgDate && <th className="py-3 px-2 min-w-[125px]">Mfg</th>}
                    {columns.expDate && <th className="py-3 px-2 min-w-[125px]">Exp</th>}
                    <th className="py-3 px-2 min-w-[80px] text-right">Qty</th>
                    {columns.freeQty && <th className="py-3 px-2 min-w-[75px] text-right">Free</th>}
                    <th className="py-3 px-2 min-w-[95px] text-right">Rate</th>
                    {columns.mrp && <th className="py-3 px-2 min-w-[90px] text-right">MRP</th>}
                    {columns.tradeDisc && <th className="py-3 px-2 min-w-[75px] text-right">Dis%</th>}
                    {columns.gst && <th className="py-3 px-2 min-w-[75px] text-right">GST%</th>}
                    {columns.taxableAmt && <th className="py-3 px-3 min-w-[95px] text-right">Taxable (₹)</th>}
                    {columns.gstAmt && <th className="py-3 px-3 min-w-[90px] text-right">GST Amt</th>}
                    <th className="py-3 px-3 min-w-[95px] text-right">Amount</th>
                    <th className="py-3 px-2 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {computedItems.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                        No items added yet. Click &quot;Auto Extract Data&quot; or &quot;Add Item&quot;.
                      </td>
                    </tr>
                  ) : (
                    computedItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2.5 px-3 min-w-[280px]">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) =>
                                handleItemChange(idx, "productName", e.target.value)
                              }
                              className="w-full font-bold bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-amber-500 outline-none text-slate-900 dark:text-slate-100"
                              placeholder="Product Name"
                            />
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {item.isNewProduct ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                                  ★ New Product
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                                  ✓ Matched ({Math.round((item.matchScore || 1) * 100)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {columns.hsn && (
                          <td className="py-2.5 px-2 min-w-[85px]">
                            <input
                              type="text"
                              value={item.hsnCode}
                              onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                        )}

                        {columns.pack && (
                          <td className="py-2.5 px-2 min-w-[80px]">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="10*10"
                            />
                          </td>
                        )}

                        {columns.batch && (
                          <td className="py-2.5 px-2 min-w-[95px]">
                            <input
                              type="text"
                              value={item.batchNo}
                              onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none font-mono focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                        )}

                        {columns.mfgDate && (
                          <td className="py-2.5 px-2 min-w-[125px]">
                            <input
                              type="text"
                              value={item.mfgDate || ""}
                              onChange={(e) => handleItemChange(idx, "mfgDate", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="MM/YY"
                            />
                          </td>
                        )}

                        {columns.expDate && (
                          <td className="py-2.5 px-2 min-w-[125px]">
                            <input
                              type="text"
                              value={item.expDate}
                              onChange={(e) => handleItemChange(idx, "expDate", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="YYYY-MM"
                            />
                          </td>
                        )}

                        <td className="py-2.5 px-2 text-right min-w-[80px]">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) =>
                              handleItemChange(idx, "qty", parseFloat(e.target.value) || 0)
                            }
                            className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none font-bold focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>

                        {columns.freeQty && (
                          <td className="py-2.5 px-2 text-right min-w-[75px]">
                            <input
                              type="number"
                              value={item.freeQty}
                              onChange={(e) =>
                                handleItemChange(idx, "freeQty", parseFloat(e.target.value) || 0)
                              }
                              className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        )}

                        <td className="py-2.5 px-2 text-right min-w-[95px]">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) =>
                              handleItemChange(idx, "rate", parseFloat(e.target.value) || 0)
                            }
                            className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>

                        {columns.mrp && (
                          <td className="py-2.5 px-2 text-right min-w-[90px]">
                            <input
                              type="number"
                              value={item.mrp}
                              onChange={(e) =>
                                handleItemChange(idx, "mrp", parseFloat(e.target.value) || 0)
                              }
                              className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        )}

                        {columns.tradeDisc && (
                          <td className="py-2.5 px-2 text-right min-w-[75px]">
                            <input
                              type="number"
                              value={item.discountPercent}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "discountPercent",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        )}

                        {columns.gst && (
                          <td className="py-2.5 px-2 text-right min-w-[75px]">
                            <input
                              type="number"
                              value={item.gstPercent}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "gstPercent",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none font-bold text-amber-600 dark:text-amber-400 focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        )}

                        {columns.taxableAmt && (
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white min-w-[95px]">
                            ₹{item.taxableAmount.toFixed(2)}
                          </td>
                        )}

                        {columns.gstAmt && (
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                            ₹{item.gstAmount.toFixed(2)}
                          </td>
                        )}

                        <td className="py-2.5 px-3 text-right font-black text-amber-600 dark:text-amber-400">
                          ₹{item.total.toFixed(2)}
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw Extracted Payload Accordion */}
          {rawExtractedData && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800">
              <button
                onClick={() => setShowRawInspector(!showRawInspector)}
                className="w-full flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <FaShieldAlt className="text-amber-500" /> View Raw AI Extracted JSON Payload
                </span>
                {showRawInspector ? <FaChevronUp /> : <FaChevronDown />}
              </button>

              {showRawInspector && (
                <pre className="mt-3 p-4 bg-slate-950 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {JSON.stringify(rawExtractedData, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Card 5: Financial Summary & Final Post Button */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="w-full md:w-1/2 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Paid Amount (₹)
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 text-sm font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Remarks / Notes
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Right Calculations Summary Block */}
            <div className="w-full md:w-1/2 bg-slate-50/80 dark:bg-slate-950/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs shadow-inner">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                <span>Subtotal Taxable Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{subtotalTaxable.toFixed(2)}
                </span>
              </div>

              {taxType === "Intrastate" ? (
                <>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                    <span>CGST Amount:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{cgst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                    <span>SGST Amount:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{sgst.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                  <span>IGST Amount ({computedItems[0]?.gstPercent || 5}%):</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{igst.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                <span>Round Off:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{roundOff.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-white">
                <span>Net Payable Amount:</span>
                <span className="text-2xl text-amber-500 font-black tracking-tight">
                  ₹{netAmount.toFixed(2)}
                </span>
              </div>

              {balanceAmount > 0 && (
                <div className="flex justify-between text-xs font-extrabold text-red-500 pt-1">
                  <span>Balance Due:</span>
                  <span>₹{balanceAmount.toFixed(2)}</span>
                </div>
              )}

              <button
                onClick={handleSavePurchaseBill}
                disabled={saving}
                className={`w-full mt-4 py-3.5 px-5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl ${
                  saving
                    ? "bg-slate-400 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30 hover:scale-[1.01]"
                }`}
              >
                {saving ? (
                  <>
                    <FaSync className="animate-spin text-sm" /> Saving Purchase Record...
                  </>
                ) : (
                  <>
                    <FaSave className="text-sm" /> Save Purchase Bill & Post to DB
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-800 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FaCamera className="text-amber-400" /> Live Purchase Bill Photo Scanner
              </h3>
              <button onClick={stopCamera} className="text-slate-400 hover:text-white text-lg">
                <FaTimes />
              </button>
            </div>

            <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={stopCamera}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-500/25"
              >
                <FaCamera /> Capture Picture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-7 text-center shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
              <FaCheckCircle />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Purchase Bill Saved!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Purchase Bill <span className="font-extrabold text-amber-600">{createdBillNo}</span> has been posted to MongoDB database.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => router.push("/dashboard/purchase/invoice")}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-lg shadow-emerald-600/25"
              >
                View Purchase Invoices List
              </button>

              <button
                onClick={() => {
                  setSuccessModal(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setItems([]);
                  setVendorName("");
                  setVendorGst("");
                  fetchNextVcn();
                }}
                className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
              >
                Scan Another Purchase Bill
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Scan Review & Supplier Selection Modal */}
      {showAiReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
                  <FaMagic />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    AI Scan Verification & Supplier Selector
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Verify extracted invoice details and choose the correct supplier / vendor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiReviewModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors"
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto pr-1 space-y-6 flex-1 text-xs">
              {/* SECTION 1: Detected Parties on Bill (1-Click Switch) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                    <FaBuilding className="text-amber-500 text-sm" /> Step 1: Choose Supplier / Seller from Bill
                  </h4>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                    {candidateParties.length} Parties Detected
                  </span>
                </div>

                {candidateParties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {candidateParties.map((party, idx) => {
                      const isSelected =
                        reviewTempVendorName &&
                        party.name &&
                        reviewTempVendorName.trim().toUpperCase() === party.name.trim().toUpperCase();

                      return (
                        <div
                          key={idx}
                          onClick={() => selectCandidateParty(party, idx)}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                            isSelected
                              ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-500/20"
                              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-slate-600"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                                  party.role?.includes("Header") || party.role?.includes("Seller")
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                                }`}
                              >
                                {party.role || `Party #${idx + 1}`}
                              </span>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-sm">
                                  <FaCheckCircle /> Selected
                                </span>
                              )}
                            </div>

                            <div className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                              {party.name || "Unknown Entity"}
                            </div>

                            <div className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                              {party.gst && (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-500">GSTIN:</span>
                                  <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{party.gst}</span>
                                </div>
                              )}
                              {party.dlNo && (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-500">DL No:</span>
                                  <span className="font-mono text-slate-800 dark:text-slate-300">{party.dlNo}</span>
                                </div>
                              )}
                              {party.phone && (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-500">Phone:</span>
                                  <span>{party.phone}</span>
                                </div>
                              )}
                              {party.address && (
                                <div className="text-slate-500 dark:text-slate-400 truncate">
                                  {party.address}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectCandidateParty(party, idx);
                            }}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white"
                            }`}
                          >
                            <FaCheckCircle className="text-xs" />
                            {isSelected ? "Selected as Supplier" : "Select as Supplier"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-500 text-center">
                    No multiple candidate parties found. You can edit the supplier details below.
                  </div>
                )}
              </div>

              {/* SECTION 2: Link with Existing DB Supplier or Edit Supplier Details */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                    <FaUserPlus className="text-amber-500" /> Step 2: Verify or Edit Chosen Supplier Details
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {reviewTempSupplierId ? "✓ Linked with DB Supplier" : "New Supplier (Will auto-register)"}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Link with CRM Database Supplier (Optional):
                  </label>
                  <SearchableSelect
                    options={supplierOptions}
                    value={reviewTempSupplierId}
                    onChange={(val) => {
                      setReviewTempSupplierId(val);
                      const matched = suppliersList.find((s) => s.id === val);
                      if (matched) {
                        setReviewTempVendorName(matched.name);
                        setReviewTempVendorGst(matched.gst);
                        setReviewTempVendorPhone(matched.phone);
                        setReviewTempVendorAddress(matched.address);
                      }
                    }}
                    placeholder="Search supplier in your database..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      value={reviewTempVendorName}
                      onChange={(e) => setReviewTempVendorName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      GSTIN Number
                    </label>
                    <input
                      type="text"
                      value={reviewTempVendorGst}
                      onChange={(e) => setReviewTempVendorGst(e.target.value.toUpperCase())}
                      className="w-full mt-1 px-3 py-2 text-xs font-bold uppercase font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Drug License No
                    </label>
                    <input
                      type="text"
                      value={reviewTempVendorDlNo}
                      onChange={(e) => setReviewTempVendorDlNo(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={reviewTempVendorPhone}
                      onChange={(e) => setReviewTempVendorPhone(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Bill Headers & Tax Mode */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                  <FaReceipt className="text-amber-500" /> Step 3: Bill Meta & Tax Mode
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Supplier Invoice No
                    </label>
                    <input
                      type="text"
                      value={reviewTempInvoiceNo}
                      onChange={(e) => setReviewTempInvoiceNo(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Bill Date
                    </label>
                    <input
                      type="date"
                      value={reviewTempBillDate}
                      onChange={(e) => setReviewTempBillDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={reviewTempDueDate}
                      onChange={(e) => setReviewTempDueDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Tax Mode
                    </label>
                    <div className="flex items-center gap-1 mt-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setReviewTempTaxType("Interstate")}
                        className={`flex-1 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                          reviewTempTaxType === "Interstate"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        IGST
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewTempTaxType("Intrastate")}
                        className={`flex-1 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                          reviewTempTaxType === "Intrastate"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        CGST+SGST
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Line Items Summary Preview */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                    <FaBoxOpen className="text-amber-500 text-sm" /> Extracted Medicines / Line Items ({items.length})
                  </h4>
                  <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    Net Total: ₹{netAmount.toFixed(2)}
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 font-bold text-slate-700 dark:text-slate-200">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Product Name</th>
                        <th className="p-2">Batch</th>
                        <th className="p-2">Exp</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Free</th>
                        <th className="p-2 text-right">Rate (₹)</th>
                        <th className="p-2 text-right">MRP (₹)</th>
                        <th className="p-2 text-right">GST %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                          <td className="p-2 text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-800 dark:text-slate-100">{it.productName}</td>
                          <td className="p-2 font-mono">{it.batchNo || "-"}</td>
                          <td className="p-2 font-mono">{it.expDate || "-"}</td>
                          <td className="p-2 text-right font-extrabold">{it.qty}</td>
                          <td className="p-2 text-right text-emerald-600 font-bold">{it.freeQty || 0}</td>
                          <td className="p-2 text-right font-mono">₹{it.rate}</td>
                          <td className="p-2 text-right font-mono">₹{it.mrp}</td>
                          <td className="p-2 text-right">{it.gstPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowAiReviewModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
              >
                Cancel / Edit Manually
              </button>

              <button
                type="button"
                onClick={handleApplyReviewedData}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black tracking-wide uppercase shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <FaCheckCircle className="text-base" /> Apply & Fill in Bill Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
