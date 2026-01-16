/**
 * QR Code Fixtures
 *
 * Predefined QR code data for testing QR code generation and assignment.
 * Format: QR-XXXXXX (6 uppercase alphanumeric)
 */

export interface QRCodeFixture {
  short_id: string;
  status: 'generated' | 'assigned' | 'printed';
  box?: string; // Reference to box fixture name
}

/**
 * Generated QR codes (not yet assigned)
 */
export const QR_GENERATED_001: QRCodeFixture = {
  short_id: 'QR-A1B2C3',
  status: 'generated',
};

export const QR_GENERATED_002: QRCodeFixture = {
  short_id: 'QR-D4E5F6',
  status: 'generated',
};

export const QR_GENERATED_003: QRCodeFixture = {
  short_id: 'QR-G7H8I9',
  status: 'generated',
};

export const QR_GENERATED_004: QRCodeFixture = {
  short_id: 'QR-J0K1L2',
  status: 'generated',
};

export const QR_GENERATED_005: QRCodeFixture = {
  short_id: 'QR-M3N4O5',
  status: 'generated',
};

/**
 * Assigned QR codes (linked to boxes)
 */
export const QR_ASSIGNED_ELECTRONICS: QRCodeFixture = {
  short_id: 'QR-P6Q7R8',
  status: 'assigned',
  box: 'Electronics',
};

export const QR_ASSIGNED_HOLIDAY: QRCodeFixture = {
  short_id: 'QR-S9T0U1',
  status: 'assigned',
  box: 'Holiday Decorations',
};

export const QR_ASSIGNED_BOOKS: QRCodeFixture = {
  short_id: 'QR-V2W3X4',
  status: 'assigned',
  box: 'Books',
};

export const QR_ASSIGNED_KITCHEN: QRCodeFixture = {
  short_id: 'QR-Y5Z6A7',
  status: 'assigned',
  box: 'Kitchen Supplies',
};

export const QR_ASSIGNED_TOOLS: QRCodeFixture = {
  short_id: 'QR-B8C9D0',
  status: 'assigned',
  box: 'Tools',
};

/**
 * Printed QR codes (physical labels created)
 */
export const QR_PRINTED_001: QRCodeFixture = {
  short_id: 'QR-E1F2G3',
  status: 'printed',
};

export const QR_PRINTED_002: QRCodeFixture = {
  short_id: 'QR-H4I5J6',
  status: 'printed',
};

/**
 * Batch of generated QR codes for testing batch operations
 */
export const QR_BATCH_GENERATED = [
  QR_GENERATED_001,
  QR_GENERATED_002,
  QR_GENERATED_003,
  QR_GENERATED_004,
  QR_GENERATED_005,
] as const;

/**
 * All assigned QR codes
 */
export const QR_ASSIGNED_CODES = [
  QR_ASSIGNED_ELECTRONICS,
  QR_ASSIGNED_HOLIDAY,
  QR_ASSIGNED_BOOKS,
  QR_ASSIGNED_KITCHEN,
  QR_ASSIGNED_TOOLS,
] as const;

/**
 * All printed QR codes
 */
export const QR_PRINTED_CODES = [QR_PRINTED_001, QR_PRINTED_002] as const;

/**
 * All predefined QR codes
 */
export const ALL_QR_CODES = [
  ...QR_BATCH_GENERATED,
  ...QR_ASSIGNED_CODES,
  ...QR_PRINTED_CODES,
] as const;

/**
 * QR code format validation test cases
 */
export const QR_FORMAT_TESTS = {
  valid: [
    'QR-ABC123',
    'QR-000000',
    'QR-ZZZZZZ',
    'QR-A1B2C3',
  ],
  invalid: [
    'QR-12345', // Too short
    'QR-1234567', // Too long
    'QR-abc123', // Lowercase not allowed
    'QRABC123', // Missing dash
    'QR-ABC-12', // Extra dash
    'QR-@#$%^&', // Special characters
  ],
} as const;
