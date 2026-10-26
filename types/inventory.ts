export type Role = "ADMIN" | "DIREKTUR" | "LEADER";

export type RequestStatus =
  | "PENDING_ADMIN"
  | "PENDING_DIRECTOR"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

export type DeliveryStatus = "ISSUED" | "CONFIRMED" | "COMPLETED";
export type TurnoverStatus = "DRAFT" | "SUBMITTED" | "VERIFIED";

export type Item = {
  id: string;
  code: string;
  name: string;
  category: string;
  brand: string | null;
  size: string | null;
  unit: string;
  stockGudang: number;
  stockOperasional: number;
  minStock: number;
  supplierId: string | null;
  isActive: boolean;
  supplier?: { id: string; name: string } | null;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  _count?: { items: number };
};

export type IncomingItem = { id: string; itemId: string; qty: number; item: Item };

export type Incoming = {
  id: string;
  number: string;
  receivedAt: string;
  supplierId: string;
  documentNo: string | null;
  note: string | null;
  supplier: Supplier;
  createdBy: { name: string };
  items: IncomingItem[];
};

export type RequestItem = { id: string; itemId: string; qty: number; item: Item };

export type InventoryRequest = {
  id: string;
  number: string;
  jobNo: string;
  site: string;
  customer: string | null;
  neededAt: string;
  estimatedDoneAt: string | null;
  note: string | null;
  status: RequestStatus;
  adminNote: string | null;
  directorNote: string | null;
  createdAt: string;
  leader: { id: string; name: string };
  admin: { name: string } | null;
  director: { name: string } | null;
  items: RequestItem[];
  delivery: { id: string; number: string; status: DeliveryStatus } | null;
};

export type DeliveryNoteItem = {
  id: string;
  itemId: string;
  qty: number;
  boxes: string | null;
  item: Item;
};

export type DeliveryNote = {
  id: string;
  number: string;
  status: DeliveryStatus;
  vehicle: string | null;
  issuedAt: string;
  confirmedAt: string | null;
  request: {
    id: string;
    number: string;
    jobNo: string;
    site: string;
    customer: string | null;
    leader: { name: string };
  };
  createdBy: { name: string };
  items: DeliveryNoteItem[];
  turnover: { id: string; status: TurnoverStatus } | null;
};

export type TurnoverItem = {
  id: string;
  itemId: string;
  brought: number;
  used: number;
  returned: number;
  damaged: number;
  item: Item;
};

export type Turnover = {
  id: string;
  status: TurnoverStatus;
  note: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  deliveryNote: DeliveryNote;
  submittedBy: { name: string };
  verifiedBy: { name: string } | null;
  items: TurnoverItem[];
};

export type OnSiteNote = {
  id: string;
  number: string;
  status: DeliveryStatus;
  issuedAt: string;
  confirmedAt: string | null;
  request: {
    number: string;
    jobNo: string;
    site: string;
    customer: string | null;
    leader: { name: string };
  };
  items: { id: string; qty: number; item: Item }[];
};

export type DashboardData = {
  itemCount: number;
  stockGudang: number;
  stockOperasional: number;
  lowStock: Item[];
  pendingApprovals: number;
  pendingDirector: number;
  pendingTurnover: number;
  incomingThisMonth: number;
  outgoingThisMonth: number;
  onSite: OnSiteNote[];
  chart: { month: string; masuk: number; keluar: number }[];
  pipeline: {
    pendingAdmin: number;
    pendingDirector: number;
    readyToShip: number;
    onSite: number;
    completed: number;
  };
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  banned: boolean | null;
  createdAt: string;
};
