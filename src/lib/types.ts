// [INTENT]: Tipi TypeScript che rispecchiano 1:1 i DTO dell'Admin API del Backend
// (WebAgency_BookingSystem.Core/Dtos/Admin/*). Nomi in camelCase perché System.Text.Json serializza così
// di default. Se un DTO cambia lato .NET, cambia qui — e in nessun altro posto del frontend.

export type PagedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ErrorResponse = {
  type: string;
  message: string;
  errors?: Record<string, string[]> | null;
};

export type AdminTokenResponse = {
  token: string;
  tokenType: string;
  expiresAt: string;
};

export type AdminProfile = {
  userId: string;
  email: string;
  role: string;
  active: boolean;
  activatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
};

export type BookingStatus = "confirmed" | "cancelled" | "no_show" | "completed";
export type AppointmentMode = "on_site" | "remote";
export type ConsentChannel = "phone" | "in_person";

export type Ref = { id: string; name: string };

export type AdminCustomerInfo = {
  name: string;
  phone: string;
  email: string;
  notes: string | null;
};

export type Booking = {
  id: string;
  date: string; // yyyy-MM-dd, ora locale del salone
  time: string; // HH:mm
  durationMin: number;
  status: BookingStatus;
  service: Ref;
  staff: Ref | null;
  customer: AdminCustomerInfo;
  price: number | null;
  createdAt: string;
};

export type BookingItem = {
  serviceId: string;
  serviceName: string;
  sequence: number;
  durationMinutes: number;
  priceAtBooking: number | null;
};

export type BookingDetail = Booking & {
  items: BookingItem[];
  appointmentMode: AppointmentMode | null;
  customerId: string | null;
  emailsEnabled: boolean | null;
  gdprConsent: boolean;
  gdprConsentAt: string;
  gdprConsentVersion: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  noShowMarkedAt: string | null;
  reminderSentAt: string | null;
  consentChannel: string;
  internalNotes: string | null;
};

export type CreateBookingRequest = {
  serviceId: string;
  additionalServiceIds: string[] | null;
  staffId: string | null;
  date: string;
  time: string;
  customer: { name: string; phone: string; email: string | null; notes: string | null };
  customerId: string | null;
  consentChannel: ConsentChannel;
  consentAttested: boolean;
  gdprConsentVersion: string | null;
  emailsEnabled: boolean | null;
  appointmentMode: AppointmentMode | null;
};

export type UpdateBookingContactRequest = {
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  appointmentMode?: string | null;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  regular: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CustomerWriteRequest = {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  regular?: boolean | null;
  blocked?: boolean | null;
};

export type CustomerUpdateRequest = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  regular?: boolean | null;
  blocked?: boolean | null;
};

export type Service = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  durationMinutes: number;
  basePrice: number | null;
  parallelSlots: number;
  bufferEnabled: boolean;
  bufferMinutes: number;
  bufferPosition: string;
  active: boolean;
  displayOrder: number;
  deletedAt: string | null;
  color: string | null;
};

export type StaffServiceAssignment = { serviceId: string; priceOverride: number | null };

export type StaffBusinessHoursItem = {
  dayOfWeek: number; // 0 = domenica … 6 = sabato
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
};

export type Staff = {
  id: string;
  name: string;
  role: string | null;
  specialization: string | null;
  photoUrl: string | null;
  active: boolean;
  displayOrder: number;
  services: StaffServiceAssignment[];
  businessHours: StaffBusinessHoursItem[]; // sempre 7 voci ordinate
  deletedAt: string | null;
  businessHoursConfigured: boolean;
};

/** POST /admin/staff e PUT /admin/staff/{id}: SOSTITUZIONE completa. businessHours: 7 voci obbligatorie. */
export type StaffWriteRequest = {
  name: string;
  role: string | null;
  specialization: string | null;
  photoUrl: string | null;
  active: boolean;
  displayOrder: number;
  services: StaffServiceAssignment[];
  businessHours: StaffBusinessHoursItem[];
};

/** POST /admin/services e PUT /admin/services/{id}: SOSTITUZIONE completa (un campo omesso viene azzerato). */
export type ServiceWriteRequest = {
  name: string;
  category: string | null;
  description: string | null;
  durationMinutes: number;
  basePrice: number | null;
  parallelSlots: number;
  bufferEnabled: boolean;
  bufferMinutes: number;
  bufferPosition: "Before" | "After" | "Both";
  active: boolean;
  displayOrder: number;
  color: string | null;
};

export type BusinessHoursItem = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
};
export type AdminBusinessHours = { configured: boolean; days: BusinessHoursItem[] };

export type BreakItem = { dayOfWeek: number; startTime: string; endTime: string; label: string | null };
export type StaffBreaksGroup = { staffId: string; staffName: string; breaks: BreakItem[] };
export type BreaksResponse = { tenant: BreakItem[]; staff: StaffBreaksGroup[] };

export type ClosureRecurrence = "none" | "annual" | "easter" | "easter_monday";
export type Closure = { id: string; dateFrom: string; dateTo: string; reason: string | null; recurrence: ClosureRecurrence };
export type ClosureRequest = { dateFrom: string; dateTo: string; reason: string | null; recurrence: ClosureRecurrence };
export type Holiday = { date: string; name: string; recurrence: ClosureRecurrence };

export type TimeBlock = { id: string; dateFrom: string; dateTo: string; startTime: string; endTime: string; reason: string | null };
export type TimeBlockRequest = Omit<TimeBlock, "id">;

export type StaffTimeOffReason = "vacation" | "illness" | "personal_leave" | "other";
export type StaffTimeOff = {
  id: string;
  dateFrom: string;
  dateTo: string;
  startTime: string | null;
  endTime: string | null;
  reason: StaffTimeOffReason | null;
};
export type StaffTimeOffRequest = Omit<StaffTimeOff, "id">;

export type AvailabilitySlot = { time: string; available: boolean; reason: string | null };
export type AvailabilityDay = {
  date: string;
  available: boolean;
  reason: string | null;
  slots: AvailabilitySlot[];
};

export type AdminTenant = {
  tenantId: string;
  name: string;
  slug: string;
  timezone: string;
  address: string | null;
  phone: string | null;
  color: string | null;
  logoUrl: string | null;
  bookingManagementPath: string | null;
  googleReviewUrl: string | null;
  emailConfirmationEnabled: boolean;
  emailReminderEnabled: boolean;
  emailCancellationEnabled: boolean;
  emailOwnerNotificationEnabled: boolean;
  emailReviewRequestEnabled: boolean;
};

/** PATCH /admin/tenant: testo null = non toccare, "" = svuota; bool null = non toccare. */
export type AdminUpdateTenantRequest = {
  address?: string | null;
  phone?: string | null;
  color?: string | null;
  bookingManagementPath?: string | null;
  googleReviewUrl?: string | null;
  emailConfirmationEnabled?: boolean | null;
  emailReminderEnabled?: boolean | null;
  emailCancellationEnabled?: boolean | null;
  emailOwnerNotificationEnabled?: boolean | null;
  emailReviewRequestEnabled?: boolean | null;
};
