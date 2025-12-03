import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  adjustInventoryItem,
  createInventoryItem,
  fetchInventory,
  fetchInventoryMovements,
  loadInventoryFromCache,
} from "../store/slices/inventory.slice";
import Alert from "../components/Alert";
import { parseApiError } from "../utils/errors";
import CreateInventoryItemModal from "../components/inventory/CreateInventoryItemModal";
import AdjustStockModal from "../components/inventory/AdjustStockModal";
import StockMovementsPanel from "../components/inventory/StockMovementsPanel";
import {
  AdjustInventoryPayload,
  CreateInventoryPayload,
  InventoryListItem,
  inventoryService,
} from "../services/inventory.service";
import ImportInventoryModal from "../components/inventory/ImportInventoryModal";
import InventoryBatchesModal from "../components/inventory/InventoryBatchesModal";
import BarcodeScannerModal from "../components/inventory/BarcodeScannerModal";

type StatusFilter =
  | "all"
  | "low-stock"
  | "out-of-stock"
  | "expiring-soon"
  | "expired";

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Low stock", value: "low-stock" },
  { label: "Out of stock", value: "out-of-stock" },
  { label: "Expiring soon", value: "expiring-soon" },
  { label: "Expired", value: "expired" },
];

const InventoryPage = () => {
  const dispatch = useAppDispatch();
  const {
    items,
    loading,
    error,
    isOffline,
    lastSyncedAt,
    movementsByItem,
    movementsLoading,
  } = useAppSelector((state) => state.inventory);
  const { activePharmacyId } = useAppSelector((state) => state.pharmacies);
  const user = useAppSelector((state) => state.auth.user);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<InventoryListItem | null>(
    null
  );
  const [editingItem, setEditingItem] = useState<InventoryListItem | null>(
    null
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [batchItem, setBatchItem] = useState<InventoryListItem | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  useEffect(() => {
    if (!activePharmacyId) {
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine) {
      dispatch(fetchInventory({ pharmacyId: activePharmacyId }));
    } else {
      dispatch(loadInventoryFromCache({ pharmacyId: activePharmacyId }));
    }
  }, [dispatch, activePharmacyId]);

  useEffect(() => {
    if (!activePharmacyId) {
      return;
    }
    const handleOnline = () => {
      dispatch(fetchInventory({ pharmacyId: activePharmacyId }));
    };
    const handleOffline = () => {
      dispatch(loadInventoryFromCache({ pharmacyId: activePharmacyId }));
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [dispatch, activePharmacyId]);

  useEffect(() => {
    if (!activePharmacyId || !selectedItemId) {
      return;
    }
    if (!movementsByItem[selectedItemId] && !isOffline) {
      dispatch(
        fetchInventoryMovements({
          pharmacyId: activePharmacyId,
          itemId: selectedItemId,
        })
      );
    }
  }, [dispatch, activePharmacyId, selectedItemId, movementsByItem, isOffline]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const search = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !search ||
          item.name.toLowerCase().includes(search) ||
          (item.genericName ?? "").toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search);
        if (!matchesSearch) {
          return false;
        }
        if (statusFilter === "all") {
          return true;
        }
        return item.meta.statusTags.includes(statusFilter);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchTerm, statusFilter]);

  const lowStockCount = useMemo(
    () => items.filter((item) => item.meta.isLowStock).length,
    [items]
  );
  const outOfStockCount = useMemo(
    () => items.filter((item) => item.meta.isOutOfStock).length,
    [items]
  );
  const expiringCount = useMemo(
    () =>
      items.filter((item) => item.meta.isExpiringSoon || item.meta.isExpired)
        .length,
    [items]
  );

  const handleCreate = useCallback(
    async (payload: CreateInventoryPayload) => {
      if (!activePharmacyId) {
        return;
      }
      setBannerError(null);
      setBannerSuccess(null);
      try {
        await dispatch(
          createInventoryItem({ pharmacyId: activePharmacyId, payload })
        ).unwrap();
        setBannerSuccess("Inventory item saved successfully.");
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          window.scrollTo(0, 0);
        }
        // Refresh list
        dispatch(fetchInventory({ pharmacyId: activePharmacyId }));
      } catch (err) {
        setBannerError(parseApiError(err));
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          window.scrollTo(0, 0);
        }
      }
    },
    [dispatch, activePharmacyId]
  );
  const handleExport = async () => {
    if (!activePharmacyId) return;
    try {
      const response = await inventoryService.exportCsv(activePharmacyId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-${activePharmacyId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setBannerError(parseApiError(err));
    }
  };

  const handleImport = async (rows: CreateInventoryPayload[]) => {
    if (!activePharmacyId) return;
    const result = await inventoryService.importBulk(activePharmacyId, {
      items: rows,
    });
    setImportSummary(
      `${result.processed} rows processed · ${
        result.summary.filter((s) => s.action === "created").length
      } new, ${
        result.summary.filter((s) => s.action === "updated").length
      } updated`
    );
    setBannerSuccess(`Imported ${result.processed} rows successfully.`);
    dispatch(fetchInventory({ pharmacyId: activePharmacyId }));
  };

  const handleAdjust = useCallback(
    async (payload: AdjustInventoryPayload) => {
      if (!activePharmacyId || !adjustTarget) {
        return;
      }
      await dispatch(
        adjustInventoryItem({
          pharmacyId: activePharmacyId,
          itemId: adjustTarget.id,
          payload,
        })
      ).unwrap();
    },
    [dispatch, activePharmacyId, adjustTarget]
  );

  const handleRefreshMovements = useCallback(() => {
    if (activePharmacyId && selectedItemId && !isOffline) {
      dispatch(
        fetchInventoryMovements({
          pharmacyId: activePharmacyId,
          itemId: selectedItemId,
        })
      );
    }
  }, [dispatch, activePharmacyId, selectedItemId, isOffline]);

  if (!activePharmacyId && user?.role !== "super_admin") {
    return (
      <div className="page">
        <h1>Inventory</h1>
        <p className="muted">
          Select a service location to view its inventory.
        </p>
      </div>
    );
  }

  if (!activePharmacyId && user?.role === "super_admin") {
    return (
      <div className="page">
        <h1>Inventory</h1>
        <p className="muted">
          Super admins do not have a default inventory workspace. Switch into an
          organization to manage stock.
        </p>
      </div>
    );
  }

  return (
    <div className="page inventory-page">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p className="subtitle">
            Monitor stock levels, stay ahead of expiries, and keep a clean audit
            trail for every movement.
          </p>
        </div>
        <div className="inventory-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowBarcodeModal(true)}
          >
            📷 Scan barcode
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowImportModal(true)}
          >
            ⬆️ Import CSV
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={handleExport}
            disabled={!activePharmacyId}
          >
            ⬇️ Export CSV
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <span className="button-icon">+</span>
            Add drug
          </button>
        </div>
      </div>

      <div className="inventory-overview">
        <div className="overview-card">
          <span>Tracked items</span>
          <strong>{items.length}</strong>
        </div>
        <div className="overview-card warning">
          <span>Low stock</span>
          <strong>{lowStockCount}</strong>
        </div>
        <div className="overview-card danger">
          <span>Out of stock</span>
          <strong>{outOfStockCount}</strong>
        </div>
        <div className="overview-card accent">
          <span>Expiring / expired</span>
          <strong>{expiringCount}</strong>
        </div>
        <div className="overview-card meta">
          <span>Status</span>
          <strong>{isOffline ? "Offline cache" : "Live"}</strong>
          {lastSyncedAt && (
            <small>
              Updated{" "}
              {new Date(lastSyncedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          )}
        </div>
      </div>

      <div className="inventory-toolbar">
        <input
          type="search"
          placeholder="Search name, generic or category"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <div className="filter-group">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={
                filter.value === statusFilter ? "filter active" : "filter"
              }
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {bannerError && (
        <Alert type="error" onClose={() => setBannerError(null)}>
          {bannerError}
        </Alert>
      )}
      {bannerSuccess && (
        <Alert type="success" onClose={() => setBannerSuccess(null)}>
          {bannerSuccess}
        </Alert>
      )}
      {importSummary && (
        <Alert type="info" onClose={() => setImportSummary(null)}>
          {importSummary}
        </Alert>
      )}
      {error && <p className="error">{error}</p>}

      <div className="inventory-content">
        <div className="inventory-table-wrapper">
          {loading && <p>Refreshing inventory…</p>}
          <div className="inventory-table-scroll">
            <table className="table inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ width: "140px" }}>Stock</th>
                  <th style={{ width: "140px" }}>Pricing</th>
                  <th style={{ width: "140px" }}>Expiry</th>
                  <th style={{ width: "160px" }}>Status</th>
                  <th style={{ width: "220px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSelected = item.id === selectedItemId;
                  const statusPills = item.meta.statusTags.length
                    ? item.meta.statusTags
                    : ["healthy"];
                  return (
                    <tr
                      key={item.id}
                      className={isSelected ? "selected" : undefined}
                      onClick={() => setSelectedItemId(item.id)}
                      role="presentation"
                    >
                      <td>
                        <div className="inventory-name">
                          <strong>{item.name}</strong>
                          {item.genericName && <span>{item.genericName}</span>}
                        </div>
                        <p className="inventory-meta">
                          {item.category} • {item.form} • {item.strength}
                        </p>
                      </td>
                      <td>
                        <div className="inventory-stock">
                          <strong>{item.quantityInStock}</strong>
                          <span>Reorder {item.reorderLevel}</span>
                        </div>
                      </td>
                      <td>
                        <div className="inventory-pricing">
                          <strong>GHS {item.sellingPrice.toFixed(2)}</strong>
                          <span>Unit {item.unitPrice.toFixed(2)}</span>
                        </div>
                      </td>
                      <td>
                        {item.expiryDate ? (
                          <span>
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="muted">N/A</span>
                        )}
                      </td>
                      <td>
                        <div className="status-chips">
                          {statusPills.map((status) => (
                            <span
                              key={status}
                              className={`status-chip status-${status}`}
                            >
                              {status.replace("-", " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="inventory-row-actions">
                          <button
                            type="button"
                            className="action-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setAdjustTarget(item);
                            }}
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            className="action-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedItemId(item.id);
                              if (!isOffline && activePharmacyId) {
                                dispatch(
                                  fetchInventoryMovements({
                                    pharmacyId: activePharmacyId,
                                    itemId: item.id,
                                  })
                                );
                              }
                            }}
                            disabled={isOffline}
                          >
                            Movements
                          </button>
                          <button
                            type="button"
                            className="action-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setBatchItem(item);
                            }}
                            disabled={!activePharmacyId}
                          >
                            Batches
                            {item.meta.batchCount
                              ? ` (${item.meta.batchCount})`
                              : ""}
                          </button>
                          <button
                            type="button"
                            className="action-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingItem(item);
                              setIsCreateModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="action-button danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              (async () => {
                                if (!activePharmacyId) return;
                                if (
                                  !confirm(
                                    `Delete "${item.name}"? This cannot be undone.`
                                  )
                                )
                                  return;
                                setBannerError(null);
                                setBannerSuccess(null);
                                try {
                                  const { inventoryService } = await import(
                                    "../services/inventory.service"
                                  );
                                  await inventoryService.deleteItem(
                                    activePharmacyId,
                                    item.id
                                  );
                                  setBannerSuccess("Inventory item deleted.");
                                  dispatch(
                                    fetchInventory({
                                      pharmacyId: activePharmacyId,
                                    })
                                  );
                                  try {
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "smooth",
                                    });
                                  } catch {
                                    window.scrollTo(0, 0);
                                  }
                                } catch (err) {
                                  setBannerError(parseApiError(err));
                                }
                              })();
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!filteredItems.length && !loading && (
            <div className="inventory-empty">
              <span role="img" aria-label="Search">
                🔍
              </span>
              <p>No items match your filters.</p>
              <small>Try clearing the filters or syncing again.</small>
            </div>
          )}
        </div>

        <StockMovementsPanel
          item={selectedItem}
          movements={
            selectedItem ? movementsByItem[selectedItem.id] : undefined
          }
          loading={movementsLoading}
          onRefresh={handleRefreshMovements}
          isOffline={isOffline}
        />
      </div>

      <CreateInventoryItemModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={async (payload) => {
          if (editingItem) {
            // Update
            if (!activePharmacyId) return;
            setBannerError(null);
            setBannerSuccess(null);
            try {
              const { inventoryService } = await import(
                "../services/inventory.service"
              );
              await inventoryService.updateItem(
                activePharmacyId,
                editingItem.id,
                payload
              );
              setBannerSuccess("Inventory item updated.");
              setEditingItem(null);
              dispatch(fetchInventory({ pharmacyId: activePharmacyId }));
              try {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } catch {
                window.scrollTo(0, 0);
              }
            } catch (err) {
              setBannerError(parseApiError(err));
              try {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } catch {
                window.scrollTo(0, 0);
              }
            }
          } else {
            await handleCreate(payload);
          }
        }}
      />
      <ImportInventoryModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
      <InventoryBatchesModal
        pharmacyId={activePharmacyId ?? ""}
        item={batchItem}
        isOpen={!!batchItem}
        onClose={() => setBatchItem(null)}
      />
      <BarcodeScannerModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        onScan={(code) => setSearchTerm(code)}
      />

      <AdjustStockModal
        isOpen={!!adjustTarget}
        item={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onSubmit={handleAdjust}
      />
    </div>
  );
};

export default InventoryPage;
