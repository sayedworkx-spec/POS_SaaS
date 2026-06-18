import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { FormEvent } from "react";

import MainLayout from "../layouts/MainLayout";

import { getCurrentUser } from "../services/authService";
import { addAuditLog } from "../services/auditService";
import { getSettings } from "../services/settingsService";
import {
  findProductByBarcode,
  getProducts,
  syncProductsCache,
} from "../services/productsApi";
import { addSale, getSales, syncSalesCache } from "../services/salesService";
import {
  addCashMovement,
  getCurrentShift,
  getShiftSummary,
} from "../services/cashRegisterService";
import {
  consumeRestoreSuspendedSale,
  deleteSuspendedSale,
  getSuspendedSales,
  suspendSale,
} from "../services/suspendedSaleService";

import type { Product } from "../types/Product";
import type { Sale } from "../types/Sale";
import type { SuspendedSaleItem } from "../types/SuspendedSale";

type CartLine = SuspendedSaleItem;

function formatMoney(value: number, currencySymbol: string) {
  return `${currencySymbol}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const CATEGORY_LABELS: Record<number, string> = {
  1: "Clothes",
  2: "Accessories",
  3: "Shoes",
  4: "Bags",
};

export default function SalesPage() {
  const currentUser = getCurrentUser();
  const settings = getSettings();
  const currentShift = getCurrentShift();
  const shiftSummary = currentShift ? getShiftSummary(currentShift.id) : null;

  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [sales, setSales] = useState<Sale[]>(() => getSales());
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [suspendedVersion, setSuspendedVersion] = useState(0);
  const [message, setMessage] = useState("");

  const barcodeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [freshProducts, freshSales] = await Promise.all([
          syncProductsCache(),
          syncSalesCache(),
        ]);

        if (!active) return;

        setProducts(freshProducts);
        setSales(freshSales);
      } catch {
        if (!active) return;
        setProducts(getProducts());
        setSales(getSales());
      } finally {
        if (active) {
          barcodeRef.current?.focus();
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const draft = consumeRestoreSuspendedSale();

    if (!draft) {
      return;
    }

    setCartLines(draft.sale.items);
    setDiscountPercent(draft.sale.discountPercent);
    setPaymentMethod(draft.sale.paymentMethod);
    setCashReceived(0);
    setReceipt(null);
    setMessage(`Restored ${draft.sale.reference} from held sales`);

    const currentHeldSales = getSuspendedSales();
    const exists = currentHeldSales.some((sale) => sale.id === draft.sourceId);

    if (exists) {
      deleteSuspendedSale(draft.sourceId);
      setSuspendedVersion((current) => current + 1);
    }

    setTimeout(() => {
      barcodeRef.current?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      const typingField =
        activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      if (e.key === "F2") {
        e.preventDefault();
        barcodeRef.current?.focus();
      }

      if (e.key === "Escape" && !typingField) {
        e.preventDefault();
        clearCart();
      }

      if (e.key === "F8" && !typingField) {
        e.preventDefault();
        handleSuspendSale();
      }

      if (e.key === "Enter" && !typingField) {
        e.preventDefault();
        void handleCheckout();
      }

      if (e.key === "F9") {
        e.preventDefault();
        void handleCheckout();
      }

      if (e.ctrlKey && e.key.toLowerCase() === "p" && receipt) {
        e.preventDefault();
        window.open(
          `/receipt/${receipt.invoiceNumber}?print=1`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt, cartLines, barcodeInput, cashReceived, discountPercent, paymentMethod]);

  const categoryIds = useMemo(() => {
    const ids = Array.from(new Set(products.map((product) => product.categoryId)));
    return ids.sort((a, b) => a - b);
  }, [products]);

  const barcodeMatches = useMemo(() => {
    const term = barcodeInput.trim().toLowerCase();

    if (!term) {
      return [];
    }

    return products
      .filter((product) => {
        const skuMatch = product.sku.toLowerCase().includes(term);
        const barcodeMatch = product.barcode.toLowerCase().includes(term);
        const nameMatch = product.name.toLowerCase().includes(term);

        return skuMatch || barcodeMatch || nameMatch;
      })
      .slice(0, 6);
  }, [products, barcodeInput]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.barcode.toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === "all" || product.categoryId === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const subtotal = useMemo(() => {
    return cartLines.reduce((sum, line) => sum + line.lineTotal, 0);
  }, [cartLines]);

  const costTotal = useMemo(() => {
    return cartLines.reduce((sum, line) => sum + line.costTotal, 0);
  }, [cartLines]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * discountPercent) / 100);
  }, [subtotal, discountPercent]);

  const total = Math.max(0, subtotal - discountAmount);
  const profit = total - costTotal;
  const change = Math.max(0, cashReceived - total);

  const suspendedSales = useMemo(() => {
    return getSuspendedSales();
  }, [suspendedVersion]);

  async function refreshData() {
    try {
      const [freshProducts, freshSales] = await Promise.all([
        syncProductsCache(),
        syncSalesCache(),
      ]);

      setProducts(freshProducts);
      setSales(freshSales);
    } catch {
      setProducts(getProducts());
      setSales(getSales());
    }
  }

  function refreshSuspendedCount() {
    setSuspendedVersion((current) => current + 1);
  }

  function focusBarcodeInput() {
    setTimeout(() => {
      barcodeRef.current?.focus();
    }, 0);
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) {
      alert("Product is out of stock");
      focusBarcodeInput();
      return;
    }

    setReceipt(null);

    setCartLines((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                lineTotal: item.unitPrice * (item.quantity + 1),
                costTotal: item.costPrice * (item.quantity + 1),
              }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: 1,
          unitPrice: product.sellPrice,
          costPrice: product.costPrice,
          lineTotal: product.sellPrice,
          costTotal: product.costPrice,
        },
      ];
    });

    focusBarcodeInput();
  }

  function handleBarcodeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const term = barcodeInput.trim();

    if (!term) {
      focusBarcodeInput();
      return;
    }

    const foundProduct =
      findProductByBarcode(term) ??
      products.find((product) =>
        product.name.toLowerCase().includes(term.toLowerCase())
      ) ??
      null;

    if (!foundProduct) {
      alert("Product not found");
      setBarcodeInput("");
      focusBarcodeInput();
      return;
    }

    addToCart(foundProduct);
    setBarcodeInput("");
    focusBarcodeInput();
  }

  function handleQuickPick(product: Product) {
    addToCart(product);
    setBarcodeInput("");
    focusBarcodeInput();
  }

  function increaseQty(productId: number) {
    setCartLines((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
              lineTotal: item.unitPrice * (item.quantity + 1),
              costTotal: item.costPrice * (item.quantity + 1),
            }
          : item
      )
    );
    focusBarcodeInput();
  }

  function decreaseQty(productId: number) {
    setCartLines((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
                lineTotal: item.unitPrice * (item.quantity - 1),
                costTotal: item.costPrice * (item.quantity - 1),
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
    focusBarcodeInput();
  }

  function removeFromCart(productId: number) {
    setCartLines((current) => current.filter((item) => item.productId !== productId));
    focusBarcodeInput();
  }

  function clearCart() {
    setCartLines([]);
    setDiscountPercent(0);
    setPaymentMethod("cash");
    setCashReceived(0);
    setReceipt(null);
    setMessage("");
    focusBarcodeInput();
  }

  function handleSuspendSale() {
    if (cartLines.length === 0) {
      alert("Cart is empty");
      return;
    }

    const held = suspendSale({
      cashier: currentUser?.name ?? "Cashier",
      reason: `Held from Sales POS`,
      paymentMethod,
      discountPercent,
      items: cartLines,
    });

    addAuditLog(
      "SALE_SUSPENDED",
      `Held sale ${held.reference} with ${held.items.length} items`,
      currentUser?.name ?? "Cashier"
    );

    setSuspendedVersion((current) => current + 1);
    clearCart();
    setMessage(`Sale held as ${held.reference}`);
    focusBarcodeInput();
  }

  async function handleCheckout() {
    if (!currentShift) {
      alert("Open a cash shift first");
      return;
    }

    if (cartLines.length === 0) {
      alert("Cart is empty");
      return;
    }

    const insufficientItem = cartLines.find((line) => {
      const product = products.find((p) => p.id === line.productId);
      return !product || product.stock < line.quantity;
    });

    if (insufficientItem) {
      const product = products.find((p) => p.id === insufficientItem.productId);
      alert(
        product
          ? `${product.name} does not have enough stock`
          : "A cart item is missing from products"
      );
      return;
    }

    if (paymentMethod === "cash" && cashReceived < total) {
      alert("Cash received is less than total");
      return;
    }

    const saleDate = new Date().toISOString();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    try {
      const newSale = await addSale({
        invoiceNumber,
        saleDate,
        cashier: currentUser?.name ?? "Cashier",
        shiftId: currentShift.id,
        paymentMethod,
        subtotal,
        costTotal,
        profit,
        discountPercent,
        discountAmount,
        total,
        cashReceived: paymentMethod === "cash" ? cashReceived : 0,
        change: paymentMethod === "cash" ? change : 0,
        items: cartLines,
      });

      addAuditLog(
        "SALE_CREATED",
        `Invoice ${invoiceNumber} - Total ${formatMoney(total, settings.currencySymbol)}`,
        currentUser?.name ?? "Cashier"
      );

      if (paymentMethod === "cash") {
        addCashMovement("IN", total, `Sale ${invoiceNumber}`);
      }

      if (settings.autoPrintReceipt) {
        window.open(
          `/receipt/${newSale.invoiceNumber}?print=1`,
          "_blank",
          "noopener,noreferrer"
        );
      }

      setReceipt(newSale);
      clearCart();
      await refreshData();
      focusBarcodeInput();
      setMessage(`Sale completed: ${newSale.invoiceNumber}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Sale failed");
    }
  }

  function setCashReceivedToFullAmount() {
    setCashReceived(total);
  }

  return (
    <MainLayout>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sales POS</h1>
          <p className="text-sm text-slate-500 mt-1">
            Barcode scan, fast checkout, and keyboard-driven sales
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow px-4 py-3">
            <div className="text-xs text-slate-500">Items in Cart</div>
            <div className="text-2xl font-bold">{cartLines.length}</div>
          </div>

          <div className="bg-white rounded-xl shadow px-4 py-3">
            <div className="text-xs text-slate-500">Current Total</div>
            <div className="text-2xl font-bold">
              {formatMoney(total, settings.currencySymbol)}
            </div>
          </div>

          <Link
            to="/suspended-sales"
            className="col-span-2 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
          >
            Held Sales ({suspendedSales.length})
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          {message}
        </div>
      )}

      {!currentShift ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-amber-900">Cash shift is closed</div>
            <div className="text-sm text-amber-800">
              Open the shift before checkout.
            </div>
          </div>

          <Link
            to="/cash-register"
            className="rounded-xl bg-amber-600 px-4 py-2 font-medium text-white"
          >
            Open Shift
          </Link>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-emerald-900">Cash shift open</div>
            <div className="text-sm text-emerald-800">
              Opening cash:{" "}
              {formatMoney(currentShift.openingCash, settings.currencySymbol)} •
              Expected cash:{" "}
              {formatMoney(
                shiftSummary?.expectedCash ?? currentShift.openingCash,
                settings.currencySymbol
              )}
            </div>
          </div>

          <Link
            to="/cash-register"
            className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white"
          >
            Cash Register
          </Link>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className="space-y-6">
          <form
            onSubmit={handleBarcodeSubmit}
            className="bg-white rounded-2xl shadow p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2">
                  Barcode / SKU Quick Add
                </label>
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or type SKU, then press Enter"
                  className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Add Item
              </button>
            </div>

            {barcodeInput.trim() && barcodeMatches.length > 0 && (
              <div className="mt-4 grid gap-2">
                {barcodeMatches.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleQuickPick(product)}
                    className="flex items-center justify-between rounded-xl border p-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-xs text-slate-500">{product.barcode}</div>
                      <div className="font-semibold">{product.name}</div>
                    </div>
                    <div className="text-sm text-slate-500">
                      {formatMoney(product.sellPrice, settings.currencySymbol)} •
                      Stock {product.stock}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {barcodeInput.trim() && barcodeMatches.length === 0 && (
              <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-slate-500">
                No direct match for this barcode / SKU.
              </div>
            )}
          </form>

          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by SKU, barcode, or product name..."
                  className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-4 py-2 rounded-full text-sm font-medium border ${
                    selectedCategory === "all"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  All
                </button>

                {categoryIds.map((categoryId) => (
                  <button
                    key={categoryId}
                    type="button"
                    onClick={() => setSelectedCategory(categoryId)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border ${
                      selectedCategory === categoryId
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    {CATEGORY_LABELS[categoryId] ?? `Category ${categoryId}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {visibleProducts.map((product) => {
              const lowStock = product.stock <= product.reorderLevel;

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className="text-left bg-white rounded-2xl shadow p-4 hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-xs text-slate-500">{product.sku}</div>
                      <div className="text-xs text-slate-400">
                        {product.barcode}
                      </div>
                      <h3 className="text-lg font-semibold leading-tight">
                        {product.name}
                      </h3>
                    </div>

                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        lowStock
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {product.stock > 0 ? `${product.stock} left` : "Out"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-slate-500">
                      {CATEGORY_LABELS[product.categoryId] ??
                        `Category ${product.categoryId}`}
                    </span>

                    <span className="font-semibold">
                      {formatMoney(product.sellPrice, settings.currencySymbol)}
                    </span>
                  </div>

                  <div className="h-px bg-slate-100 mb-4" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Reorder: {product.reorderLevel}
                    </span>

                    <span className="text-sm font-medium text-blue-600">
                      Add to Cart
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Cart</h2>

              <button
                onClick={clearCart}
                className="text-sm text-red-600 hover:underline"
              >
                Clear
              </button>
            </div>

            {cartLines.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">
                Cart is empty
              </div>
            ) : (
              <div className="space-y-3">
                {cartLines.map((line) => (
                  <div key={line.productId} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold">{line.name}</div>
                        <div className="text-xs text-slate-500">{line.sku}</div>
                      </div>

                      <button
                        onClick={() => removeFromCart(line.productId)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decreaseQty(line.productId)}
                          className="w-8 h-8 rounded-lg border"
                        >
                          -
                        </button>

                        <span className="w-8 text-center font-semibold">
                          {line.quantity}
                        </span>

                        <button
                          onClick={() => increaseQty(line.productId)}
                          className="w-8 h-8 rounded-lg border"
                        >
                          +
                        </button>
                      </div>

                      <div className="font-semibold">
                        {formatMoney(line.lineTotal, settings.currencySymbol)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 space-y-3 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatMoney(subtotal, settings.currencySymbol)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Cost</span>
                <span>{formatMoney(costTotal, settings.currencySymbol)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Profit</span>
                <span className={profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {formatMoney(profit, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Discount %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-24 border rounded-lg p-2 text-right"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount Amount</span>
                <span>-{formatMoney(discountAmount, settings.currencySymbol)}</span>
              </div>

              <div className="flex items-center justify-between text-lg font-bold border-t pt-3">
                <span>Total</span>
                <span>{formatMoney(total, settings.currencySymbol)}</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold mb-2">Payment Method</div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`py-3 rounded-xl border font-medium ${
                    paymentMethod === "cash"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  Cash
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`py-3 rounded-xl border font-medium ${
                    paymentMethod === "card"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  Card
                </button>
              </div>

              {paymentMethod === "cash" && (
                <div className="mt-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-2">
                        Cash Received
                      </label>

                      <input
                        type="number"
                        min={0}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(Number(e.target.value))}
                        className="w-full border rounded-xl p-3"
                        placeholder="Cash received"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={setCashReceivedToFullAmount}
                      className="rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Full
                    </button>
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Change: {formatMoney(change, settings.currencySymbol)}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={handleSuspendSale}
                className="rounded-xl border px-4 py-3 font-semibold"
              >
                Hold Sale
              </button>

              <button
                onClick={() => void handleCheckout()}
                className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Checkout
              </button>
            </div>
          </div>

          {receipt && (
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Last Receipt</h3>
                <span className="text-xs text-slate-500">
                  {receipt.invoiceNumber}
                </span>
              </div>

              <div className="text-sm text-slate-500 mb-3">
                {formatDate(receipt.saleDate)}
              </div>

              <div className="space-y-2">
                {receipt.items.map((item) => (
                  <div
                    key={`${item.sku}-${item.name}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">
                        {item.sku} × {item.quantity}
                      </div>
                    </div>

                    <div className="font-semibold">
                      {formatMoney(item.lineTotal, settings.currencySymbol)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(receipt.subtotal, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cost</span>
                  <span>{formatMoney(receipt.costTotal, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Profit</span>
                  <span className={receipt.profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {formatMoney(receipt.profit, settings.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatMoney(receipt.discountAmount, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatMoney(receipt.total, settings.currencySymbol)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Recent Sales</h3>
              <span className="text-xs text-slate-500">
                {sales.length} invoices
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-auto pr-1">
              {sales.slice(-6).reverse().map((sale) => (
                <div key={sale.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{sale.invoiceNumber}</div>
                    <div className="font-semibold">
                      {formatMoney(sale.total, settings.currencySymbol)}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    {sale.cashier} • {formatDate(sale.saleDate)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </MainLayout>
  );
}