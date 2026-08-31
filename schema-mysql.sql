SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `app_settings` (
  `key` VARCHAR(255),
  `value` TEXT NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `sqlite_autoindex_app_settings_1` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `approval_documents` (
  `id` INT AUTO_INCREMENT,
  `title` TEXT NOT NULL,
  `description` TEXT,
  `file_path` TEXT NOT NULL,
  `file_name` TEXT NOT NULL,
  `file_size` INT NOT NULL,
  `created_by` INT NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  `current_level` INT DEFAULT 0,
  `total_levels` INT NOT NULL,
  `final_document_path` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `root_document_id` INT,
  `previous_document_id` INT,
  `revision_number` INT NOT NULL DEFAULT 1,
  `verification_token` VARCHAR(255),
  `approved_at` DATETIME,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_approval_documents_verification_token` (`verification_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `approval_history` (
  `id` INT AUTO_INCREMENT,
  `document_id` INT NOT NULL,
  `workflow_id` INT,
  `action` TEXT NOT NULL,
  `performed_by` INT NOT NULL,
  `notes` TEXT,
  `metadata` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `approval_level_settings` (
  `id` INT AUTO_INCREMENT,
  `document_id` INT NOT NULL,
  `level` INT NOT NULL,
  `min_approvals` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sqlite_autoindex_approval_level_settings_1` (`document_id`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `approval_rejected_files` (
  `id` INT AUTO_INCREMENT,
  `document_id` INT NOT NULL,
  `workflow_id` INT,
  `history_id` INT,
  `file_path` TEXT NOT NULL,
  `file_name` TEXT NOT NULL,
  `file_size` INT NOT NULL,
  `revision_number` INT NOT NULL DEFAULT 1,
  `rejection_reason` TEXT,
  `rejected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `approval_workflows` (
  `id` INT AUTO_INCREMENT,
  `document_id` INT NOT NULL,
  `level` INT NOT NULL,
  `approver_id` INT DEFAULT NULL,
  `status` VARCHAR(255) NOT NULL,
  `signature_data` TEXT,
  `signed_at` DATETIME,
  `rejection_reason` TEXT,
  `is_checked` TINYINT(1) DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_required` TINYINT(1) DEFAULT TRUE,
  `approver_role_id` INT DEFAULT NULL,
  `notify_preference` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sqlite_autoindex_approval_workflows_1` (`document_id`, `level`, `approver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_events` (
  `id` INT AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `occurrence_id` INT,
  `actor_user_id` INT,
  `type` TEXT NOT NULL,
  `payload` TEXT,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_key_events` (
  `id` INT AUTO_INCREMENT,
  `key_token_id` INT NOT NULL,
  `booking_id` INT NOT NULL,
  `occurrence_id` INT NOT NULL,
  `actor_user_id` INT,
  `type` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_key_tokens` (
  `id` INT AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `occurrence_id` INT NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `picked_up_at` DATETIME,
  `picked_up_by` INT,
  `returned_at` DATETIME,
  `returned_by` INT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sqlite_autoindex_booking_key_tokens_2` (`occurrence_id`),
  UNIQUE KEY `sqlite_autoindex_booking_key_tokens_1` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_occurrence_slots` (
  `id` INT AUTO_INCREMENT,
  `occurrence_id` INT NOT NULL,
  `start_at` DATETIME NOT NULL,
  `end_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_occurrences` (
  `id` INT AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `occurrence_date` TEXT NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  `start_at` DATETIME NOT NULL,
  `end_at` DATETIME NOT NULL,
  `rejection_reason` TEXT,
  `cancel_reason` TEXT,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `room_id` INT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_series` (
  `id` INT AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `frequency` TEXT NOT NULL,
  `interval` INT NOT NULL DEFAULT 1,
  `start_date` TEXT NOT NULL,
  `until_date` TEXT NOT NULL,
  `slots_json` TEXT NOT NULL,
  `rule_json` TEXT,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bookings` (
  `id` INT AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  `activity_name` TEXT,
  `participant_count` INT,
  `notes` TEXT,
  `rejection_reason` TEXT,
  `is_recurring` INT NOT NULL DEFAULT 0,
  `series_id` INT,
  `hours` INT,
  `start_date` DATETIME,
  `end_date` DATETIME,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `deleted_at` DATETIME,
  `created_by` TEXT,
  `updated_by` TEXT,
  `request_letter_object_key` TEXT,
  `request_letter_file_name` TEXT,
  `request_letter_content_type` TEXT,
  `request_letter_file_size` INT,
  `external_request_id` INT,
  `external_requester_name` TEXT,
  `external_requester_phone` TEXT,
  `external_origin_environment` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `external_booking_requests` (
  `id` INT AUTO_INCREMENT,
  `requester_name` TEXT NOT NULL,
  `requester_phone` TEXT NOT NULL,
  `origin_environment` TEXT,
  `purpose` TEXT NOT NULL,
  `participant_count` INT NOT NULL,
  `notes` TEXT,
  `room_id` INT NOT NULL,
  `request_date` VARCHAR(255) NOT NULL,
  `start_time` TEXT NOT NULL,
  `end_time` TEXT NOT NULL,
  `slots_json` TEXT NOT NULL,
  `request_letter_object_key` TEXT,
  `request_letter_file_name` TEXT,
  `request_letter_content_type` TEXT,
  `request_letter_file_size` INT,
  `status` VARCHAR(255) NOT NULL,
  `rejection_reason` TEXT,
  `accepted_booking_id` INT,
  `reviewed_by` INT,
  `reviewed_at` DATETIME,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
  `id` INT AUTO_INCREMENT,
  `code` VARCHAR(255) NOT NULL,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `category` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `default_granted` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sqlite_autoindex_permissions_1` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `id` INT AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sqlite_autoindex_role_permissions_1` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT,
  `name` TEXT,
  `created_at` DATETIME,
  `updated_at` DATETIME,
  `deleted_at` DATETIME,
  `created_by` TEXT,
  `updated_by` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `room_photos` (
  `id` INT AUTO_INCREMENT,
  `room_id` INT NOT NULL,
  `object_key` TEXT NOT NULL,
  `content_type` TEXT,
  `byte_size` INT,
  `created_at` DATETIME,
  `deleted_at` DATETIME,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rooms` (
  `id` INT AUTO_INCREMENT,
  `name` TEXT,
  `location` TEXT,
  `capacity` INT,
  `description` TEXT,
  `created_at` DATETIME,
  `updated_at` DATETIME,
  `deleted_at` DATETIME,
  `created_by` TEXT,
  `updated_by` TEXT,
  `open_time_start` TEXT,
  `open_time_end` TEXT,
  `slot_minutes` INT,
  `available_for_booking` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
  `id` INT AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `role_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sqlite_autoindex_user_roles_1` (`user_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT,
  `email` VARCHAR(255),
  `fullname` TEXT,
  `password` TEXT,
  `is_verified` INT,
  `phone_number_verified` TEXT,
  `created_at` DATETIME,
  `updated_at` DATETIME,
  `deleted_at` DATETIME,
  `created_by` TEXT,
  `updated_by` TEXT,
  `role_id` INT,
  `digital_signature_data` TEXT,
  `username` VARCHAR(255),
  `phone_number` VARCHAR(255),
  `phone_number_active` VARCHAR(255) GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, `phone_number`, NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_phone_number_unique` (`phone_number_active`),
  UNIQUE KEY `idx_users_username_unique` (`username`),
  UNIQUE KEY `idx_users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_approval_documents_root_document_id` ON `approval_documents` (`root_document_id`);
CREATE INDEX `idx_approval_documents_status` ON `approval_documents` (`status`);
CREATE INDEX `idx_approval_documents_created_by` ON `approval_documents` (`created_by`);
CREATE INDEX `idx_approval_history_document_id` ON `approval_history` (`document_id`);
CREATE INDEX `idx_approval_level_settings_document` ON `approval_level_settings` (`document_id`, `level`);
CREATE INDEX `idx_approval_rejected_files_history_id` ON `approval_rejected_files` (`history_id`);
CREATE INDEX `idx_approval_rejected_files_document_id` ON `approval_rejected_files` (`document_id`);
CREATE INDEX `idx_approval_workflows_role_id` ON `approval_workflows` (`approver_role_id`);
CREATE INDEX `idx_approval_workflows_status` ON `approval_workflows` (`status`);
CREATE INDEX `idx_approval_workflows_approver_id` ON `approval_workflows` (`approver_id`);
CREATE INDEX `idx_approval_workflows_document_id` ON `approval_workflows` (`document_id`);
CREATE INDEX `idx_booking_events_created_at` ON `booking_events` (`created_at`);
CREATE INDEX `idx_booking_events_occurrence_id` ON `booking_events` (`occurrence_id`);
CREATE INDEX `idx_booking_events_booking_id` ON `booking_events` (`booking_id`);
CREATE INDEX `idx_booking_key_events_occurrence_id` ON `booking_key_events` (`occurrence_id`);
CREATE INDEX `idx_booking_key_events_token_id` ON `booking_key_events` (`key_token_id`);
CREATE INDEX `idx_booking_key_tokens_token` ON `booking_key_tokens` (`token`);
CREATE INDEX `idx_booking_key_tokens_occurrence_id` ON `booking_key_tokens` (`occurrence_id`);
CREATE INDEX `idx_booking_key_tokens_booking_id` ON `booking_key_tokens` (`booking_id`);
CREATE INDEX `idx_booking_occurrence_slots_time` ON `booking_occurrence_slots` (`start_at`, `end_at`);
CREATE INDEX `idx_booking_occurrence_slots_occurrence_id` ON `booking_occurrence_slots` (`occurrence_id`);
CREATE INDEX `idx_booking_occurrences_room_id` ON `booking_occurrences` (`room_id`);
CREATE INDEX `idx_booking_occurrences_booking_status` ON `booking_occurrences` (`booking_id`, `status`);
CREATE INDEX `idx_booking_occurrences_start_at` ON `booking_occurrences` (`start_at`);
CREATE INDEX `idx_booking_occurrences_status` ON `booking_occurrences` (`status`);
CREATE INDEX `idx_booking_occurrences_booking_id` ON `booking_occurrences` (`booking_id`);
CREATE INDEX `idx_booking_series_room_id` ON `booking_series` (`room_id`);
CREATE INDEX `idx_booking_series_user_id` ON `booking_series` (`user_id`);
CREATE INDEX `idx_bookings_series_id` ON `bookings` (`series_id`);
CREATE INDEX `idx_bookings_deleted_at` ON `bookings` (`deleted_at`);
CREATE INDEX `idx_bookings_status` ON `bookings` (`status`);
CREATE INDEX `idx_bookings_room_id` ON `bookings` (`room_id`);
CREATE INDEX `idx_bookings_user_id` ON `bookings` (`user_id`);
CREATE INDEX `idx_external_booking_requests_created_at` ON `external_booking_requests` (`created_at`);
CREATE INDEX `idx_external_booking_requests_room_date` ON `external_booking_requests` (`room_id`, `request_date`);
CREATE INDEX `idx_external_booking_requests_status` ON `external_booking_requests` (`status`);
CREATE INDEX `idx_role_permissions_permission` ON `role_permissions` (`permission_id`);
CREATE INDEX `idx_role_permissions_role` ON `role_permissions` (`role_id`);
CREATE INDEX `idx_room_photos_room_id` ON `room_photos` (`room_id`);
CREATE INDEX `idx_user_roles_role` ON `user_roles` (`role_id`);
CREATE INDEX `idx_user_roles_user` ON `user_roles` (`user_id`);
CREATE INDEX `idx_users_role_id` ON `users` (`role_id`);

ALTER TABLE `approval_documents` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `approval_history` ADD FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `approval_history` ADD FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows` (`id`) ON DELETE SET NULL;
ALTER TABLE `approval_history` ADD FOREIGN KEY (`document_id`) REFERENCES `approval_documents` (`id`) ON DELETE CASCADE;
ALTER TABLE `approval_level_settings` ADD FOREIGN KEY (`document_id`) REFERENCES `approval_documents` (`id`) ON DELETE CASCADE;
ALTER TABLE `approval_rejected_files` ADD FOREIGN KEY (`history_id`) REFERENCES `approval_history` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE `approval_rejected_files` ADD FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE `approval_rejected_files` ADD FOREIGN KEY (`document_id`) REFERENCES `approval_documents` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `approval_workflows` ADD FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `approval_workflows` ADD FOREIGN KEY (`document_id`) REFERENCES `approval_documents` (`id`) ON DELETE CASCADE;
ALTER TABLE `booking_events` ADD FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE `booking_events` ADD FOREIGN KEY (`occurrence_id`) REFERENCES `booking_occurrences` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `booking_events` ADD FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `booking_key_events` ADD FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE `booking_key_events` ADD FOREIGN KEY (`occurrence_id`) REFERENCES `booking_occurrences` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `booking_key_events` ADD FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `booking_key_events` ADD FOREIGN KEY (`key_token_id`) REFERENCES `booking_key_tokens` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `booking_key_tokens` ADD FOREIGN KEY (`returned_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE `booking_key_tokens` ADD FOREIGN KEY (`picked_up_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE `booking_key_tokens` ADD FOREIGN KEY (`occurrence_id`) REFERENCES `booking_occurrences` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `booking_key_tokens` ADD FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `booking_occurrence_slots` ADD FOREIGN KEY (`occurrence_id`) REFERENCES `booking_occurrences` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `booking_occurrences` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE `booking_occurrences` ADD FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `booking_series` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE `booking_series` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE `bookings` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE `bookings` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE `external_booking_requests` ADD FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE `external_booking_requests` ADD FOREIGN KEY (`accepted_booking_id`) REFERENCES `bookings` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE `external_booking_requests` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE `role_permissions` ADD FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;
ALTER TABLE `role_permissions` ADD FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;
ALTER TABLE `room_photos` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE `user_roles` ADD FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;
ALTER TABLE `user_roles` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

INSERT INTO `app_settings` (`key`, `value`, `updated_at`) VALUES ('booking_min_lead_days', '0', '2026-08-21 11:15:47');
INSERT INTO `app_settings` (`key`, `value`, `updated_at`) VALUES ('external_booking_letter_template_object_key', '', '2026-08-21 11:15:47');
INSERT INTO `app_settings` (`key`, `value`, `updated_at`) VALUES ('external_booking_letter_template_file_name', '', '2026-08-21 11:15:47');
INSERT INTO `app_settings` (`key`, `value`, `updated_at`) VALUES ('external_booking_letter_template_content_type', '', '2026-08-21 11:15:47');
INSERT INTO `app_settings` (`key`, `value`, `updated_at`) VALUES ('external_booking_letter_template_file_size', '0', '2026-08-21 11:15:47');
INSERT INTO `app_settings` (`key`, `value`, `updated_at`) VALUES ('external_booking_letter_template_updated_at', '', '2026-08-21 11:15:47');
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (1, 'menu.book_room', 'Pinjam Ruangan', 'Akses menu pinjam ruangan', 'Menu', '2026-08-21 11:15:47', 1);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (2, 'menu.my_bookings', 'Peminjaman Saya', 'Akses menu peminjaman saya', 'Menu', '2026-08-21 11:15:47', 1);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (3, 'menu.profile', 'Profil Saya', 'Akses menu profil', 'Menu', '2026-08-21 11:15:47', 1);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (4, 'menu.approval_document', 'Persetujuan Dokumen', 'Akses menu persetujuan dokumen', 'Menu', '2026-08-21 11:15:47', 1);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (5, 'menu.admin_bookings', 'Admin: Semua Peminjaman', 'Akses menu admin peminjaman', 'Admin', '2026-08-21 11:15:47', 0);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (6, 'menu.admin_rooms', 'Admin: Manajemen Ruangan', 'Akses menu admin ruangan', 'Admin', '2026-08-21 11:15:47', 0);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (7, 'menu.admin_calendar', 'Admin: Kalender Ruangan', 'Akses menu admin kalender', 'Admin', '2026-08-21 11:15:47', 0);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (8, 'menu.admin_users', 'Admin: Manajemen Pengguna', 'Akses menu admin pengguna', 'Admin', '2026-08-21 11:15:47', 0);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (9, 'menu.admin_roles', 'Admin: Manajemen Role', 'Akses menu admin role & permission', 'Admin', '2026-08-21 11:15:47', 0);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (10, 'menu.admin_permissions', 'Admin: Manajemen Permission', 'Akses menu admin permission', 'Admin', '2026-08-21 11:15:47', 0);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (11, 'menu.my_calendar', 'Kalender Saya', 'Akses menu kalender peminjaman pribadi', 'Menu', '2026-08-21 11:15:47', 1);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (12, 'menu.admin_settings', 'Admin: Pengaturan Umum', 'Akses menu pengaturan umum', 'Admin', '2026-08-21 11:15:47', 0);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (13, 'menu.admin_external_bookings', 'Admin: Pengajuan Booking External', 'Akses menu pengajuan booking external', 'Admin', '2026-08-21 11:15:47', 0);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (14, 'menu.security_keys', 'Satpam / Kunci Ruangan', 'Akses dashboard dan scanner kunci ruangan', 'Security', '2026-08-21 11:15:47', 0);
INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `created_at`, `default_granted`) VALUES (15, 'menu.display_rooms', 'Display Jadwal Ruangan', 'Akses tampilan TV jadwal ruangan', 'Display', '2026-08-21 11:15:47', 0);
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (1, 1, 5, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (2, 1, 7, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (3, 1, 10, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (4, 1, 9, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (5, 1, 6, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (6, 1, 8, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (7, 1, 4, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (8, 1, 1, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (9, 1, 2, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (10, 1, 3, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (11, 2, 4, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (12, 2, 1, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (13, 2, 2, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (14, 2, 3, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (15, 1, 11, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (16, 2, 11, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (17, 1, 12, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (18, 1, 13, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (19, 1, 15, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (20, 1, 14, '2026-08-21 11:15:47');
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (21, 3, 14, '2026-08-21 11:15:47');
INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES (1, 'admin', '2026-08-21 11:15:47', '2026-08-21 11:15:47', NULL, NULL, NULL);
INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES (2, 'user', '2026-08-21 11:15:47', '2026-08-21 11:15:47', NULL, NULL, NULL);
INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES (3, 'satpam', '2026-08-21 11:15:47', '2026-08-21 11:15:47', NULL, NULL, NULL);
INSERT INTO `users` (`id`, `email`, `fullname`, `password`, `is_verified`, `phone_number_verified`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `role_id`, `digital_signature_data`, `username`, `phone_number`) VALUES (1, 'external-requester@local.invalid', 'External Requester', '', 1, NULL, '2026-08-21 11:15:47', '2026-08-21 11:15:47', NULL, NULL, NULL, NULL, NULL, NULL, NULL);

SET FOREIGN_KEY_CHECKS=1;
