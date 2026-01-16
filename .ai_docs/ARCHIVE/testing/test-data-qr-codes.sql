-- Test Data for QR Codes
-- This script populates the qr_codes table with dummy data for testing
-- Format: QR-XXXXXX where X is uppercase alphanumeric [A-Z0-9]

DO $$
DECLARE
    -- Workspace IDs (from existing database)
    workspace1_id UUID := 'c79216c4-9009-476d-b0e3-ff219e122d95'; -- My Workspace
    workspace2_id UUID := 'a318f46e-ac48-4b4d-afbb-66ce86e627b4'; -- Test Workspace 1
    workspace3_id UUID := '4d5a1187-e805-4a53-845d-f118945b0dd0'; -- Workspace with boxes
    workspace4_id UUID := 'bbe11e7e-bc3e-4e04-8394-c63ab5d760ce'; -- Another workspace
    workspace5_id UUID := 'bfbf69d7-abf5-492a-bd01-bcdf99e26496'; -- Another workspace

    -- Box IDs for assigned QR codes (each box can have only ONE QR code due to unique constraint)
    box1_id UUID := 'b1b48d97-501c-4709-bd7b-d96519721367'; -- Test Box for GET endpoint
    box2_id UUID := '201015d9-15a2-493d-83c9-c46759796627'; -- Box with Location
    box3_id UUID := '046c78ad-0d52-44a9-ba2f-89b44ed56016'; -- Location Test Box
    box4_id UUID := 'dab5405d-8047-4b73-b15e-d2adb8f7d26f'; -- Unassign Test Box
    box5_id UUID := '7f9a6b9d-37d8-44f6-8e8b-15226d249378'; -- Location Test Box
    box6_id UUID := 'e4cf50be-cb1a-4a04-87e2-f5da76c3a32e'; -- Unassign Test Box
    box7_id UUID := 'a8cd0d1b-15d4-48a1-921e-96e832c728b6'; -- Minimal Box
BEGIN
    -- Workspace 1: 10 QR codes (7 generated, 2 printed, 1 assigned)
    -- Generated status (available for assignment)
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-A1B2C3', 'generated', workspace1_id, NULL),
    ('QR-D4E5F6', 'generated', workspace1_id, NULL),
    ('QR-G7H8I9', 'generated', workspace1_id, NULL),
    ('QR-J0K1L2', 'generated', workspace1_id, NULL),
    ('QR-M3N4O5', 'generated', workspace1_id, NULL),
    ('QR-P6Q7R8', 'generated', workspace1_id, NULL),
    ('QR-S9T0U1', 'generated', workspace1_id, NULL);

    -- Printed status (printed but not yet assigned)
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-V2W3X4', 'printed', workspace1_id, NULL),
    ('QR-Y5Z6A7', 'printed', workspace1_id, NULL);

    -- Assigned status (linked to a box)
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-B8C9D0', 'assigned', workspace1_id, NULL);

    -- Workspace 2: 10 QR codes (6 generated, 3 printed, 1 assigned)
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-E1F2G3', 'generated', workspace2_id, NULL),
    ('QR-H4I5J6', 'generated', workspace2_id, NULL),
    ('QR-K7L8M9', 'generated', workspace2_id, NULL),
    ('QR-N0O1P2', 'generated', workspace2_id, NULL),
    ('QR-Q3R4S5', 'generated', workspace2_id, NULL),
    ('QR-T6U7V8', 'generated', workspace2_id, NULL);

    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-W9X0Y1', 'printed', workspace2_id, NULL),
    ('QR-Z2A3B4', 'printed', workspace2_id, NULL),
    ('QR-C5D6E7', 'printed', workspace2_id, NULL);

    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-F8G9H0', 'assigned', workspace2_id, NULL);

    -- Workspace 3: 10 QR codes (5 generated, 3 printed, 2 assigned to real boxes)
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-I1J2K3', 'generated', workspace3_id, NULL),
    ('QR-L4M5N6', 'generated', workspace3_id, NULL),
    ('QR-O7P8Q9', 'generated', workspace3_id, NULL),
    ('QR-R0S1T2', 'generated', workspace3_id, NULL),
    ('QR-U3V4W5', 'generated', workspace3_id, NULL);

    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-X6Y7Z8', 'printed', workspace3_id, NULL),
    ('QR-A9B0C1', 'printed', workspace3_id, NULL),
    ('QR-D2E3F4', 'printed', workspace3_id, NULL);

    -- Assigned to real boxes in workspace 3
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-G5H6I7', 'assigned', workspace3_id, box1_id),
    ('QR-J8K9L0', 'assigned', workspace3_id, box2_id);

    -- Workspace 4: 8 QR codes (4 generated, 2 printed, 2 assigned to real boxes)
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-M1N2O3', 'generated', workspace4_id, NULL),
    ('QR-P4Q5R6', 'generated', workspace4_id, NULL),
    ('QR-S7T8U9', 'generated', workspace4_id, NULL),
    ('QR-V0W1X2', 'generated', workspace4_id, NULL);

    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-Y3Z4A5', 'printed', workspace4_id, NULL),
    ('QR-B6C7D8', 'printed', workspace4_id, NULL);

    -- Assigned to real boxes in workspace 4
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-E9F0G1', 'assigned', workspace4_id, box3_id),
    ('QR-H2I3J4', 'assigned', workspace4_id, box4_id);

    -- Workspace 5: 4 QR codes (1 generated, 1 printed, 2 assigned to real boxes)
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-K5L6M7', 'generated', workspace5_id, NULL);

    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-N8O9P0', 'printed', workspace5_id, NULL);

    -- Assigned to real boxes in workspace 5
    INSERT INTO qr_codes (short_id, status, workspace_id, box_id) VALUES
    ('QR-Q1R2S3', 'assigned', workspace5_id, box5_id),
    ('QR-T4U5V6', 'assigned', workspace5_id, box6_id);

    RAISE NOTICE 'Successfully inserted 42 QR codes across 5 workspaces';
    RAISE NOTICE 'Workspace 1: 10 QR codes (7 generated, 2 printed, 1 assigned)';
    RAISE NOTICE 'Workspace 2: 10 QR codes (6 generated, 3 printed, 1 assigned)';
    RAISE NOTICE 'Workspace 3: 10 QR codes (5 generated, 3 printed, 2 assigned to boxes)';
    RAISE NOTICE 'Workspace 4: 8 QR codes (4 generated, 2 printed, 2 assigned to boxes)';
    RAISE NOTICE 'Workspace 5: 4 QR codes (1 generated, 1 printed, 2 assigned to boxes)';
END $$;

-- Verify insertion
SELECT
    workspace_id,
    status,
    COUNT(*) as count,
    COUNT(box_id) as boxes_linked
FROM qr_codes
GROUP BY workspace_id, status
ORDER BY workspace_id, status;

-- Show sample QR codes from each workspace
SELECT
    short_id,
    status,
    CASE
        WHEN box_id IS NULL THEN 'Not assigned'
        ELSE 'Assigned to box'
    END as assignment_status,
    workspace_id
FROM qr_codes
ORDER BY workspace_id, status, short_id
LIMIT 30;