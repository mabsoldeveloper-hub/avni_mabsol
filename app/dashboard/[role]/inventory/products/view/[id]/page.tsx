"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import ProductHeader from "@/components/product/ProductHeader";
import ProductSummaryCards from "@/components/product/ProductSummaryCards";
import ProductQuickActions from "@/components/product/ProductQuickActions";
import ProductOverview from "@/components/product/ProductOverview";
import AddProductModal from "@/components/product/AddProductModal";

export default function ProductViewPage() {
  const { id } = useParams();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    const res = await fetch(`/api/products/${id}`);
    const data = await res.json();
    setProduct(data);
    setLoading(false);
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-lg-9">
          <ProductHeader product={product} />
        </div>

        <div className="col-lg-3">
          <ProductQuickActions onAddClick={() => setIsAddModalOpen(true)} />
        </div>
      </div>

      <ProductSummaryCards product={product} />

      <ProductOverview product={product} />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => loadProduct()}
      />
    </div>
  );
}