import { pgTable, pgSchema, index, check, bigint, timestamp, text, jsonb, unique, smallint, foreignKey, date, integer, boolean, numeric, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const audit = pgSchema("audit");
export const catalog = pgSchema("catalog");
export const core = pgSchema("core");
export const ops = pgSchema("ops");
export const hygieneControlTypeInOps = ops.enum("hygiene_control_type", ['STANDARD', 'SPECIAL_15', 'REWE_BY_PLAN', 'REWE_TEMP'])
export const responsiblePartyInOps = ops.enum("responsible_party", ['MUENSTERMANN', 'KUNDE'])


export const activityLogInAudit = audit.table("activity_log", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "audit.activity_log_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	actor: text(),
	action: text().notNull(),
	schemaName: text("schema_name").notNull(),
	tableName: text("table_name").notNull(),
	rowPk: text("row_pk"),
	oldRow: jsonb("old_row"),
	newRow: jsonb("new_row"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	transactionId: bigint("transaction_id", { mode: "number" }).default(sql`((pg_current_xact_id())`).notNull(),
}, (table) => [
	index("activity_log_actor_idx").using("btree", table.actor.asc().nullsLast().op("text_ops")),
	index("activity_log_occurred_at_idx").using("btree", table.occurredAt.asc().nullsLast().op("timestamptz_ops")),
	index("activity_log_table_idx").using("btree", table.schemaName.asc().nullsLast().op("text_ops"), table.tableName.asc().nullsLast().op("text_ops")),
	check("activity_log_action_check", sql`action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])`),
]);

export const hazardPhraseCategoryInCatalog = catalog.table("hazard_phrase_category", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.hazard_phrase_category_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	code: smallint().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("hazard_phrase_category_legacy_id_key").on(table.legacyId),
	unique("hazard_phrase_category_code_key").on(table.code),
	check("hazard_phrase_category_code_check", sql`code = ANY (ARRAY[200, 300, 400])`),
]);

export const hazardPhraseInCatalog = catalog.table("hazard_phrase", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.hazard_phrase_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	code: text().notNull(),
	description: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	categoryId: bigint("category_id", { mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [hazardPhraseCategoryInCatalog.id],
			name: "hazard_phrase_category_id_fkey"
		}),
	unique("hazard_phrase_legacy_id_key").on(table.legacyId),
	unique("hazard_phrase_code_key").on(table.code),
	check("hazard_phrase_code_check", sql`code ~ '^H[0-9]{3}[A-Za-z]?$|^EUH[0-9]{3}$'::text`),
]);

export const poisonInformationCenterInCatalog = catalog.table("poison_information_center", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.poison_information_center_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	city: text().notNull(),
	name: text(),
	phone: text(),
	email: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("poison_information_center_legacy_id_key").on(table.legacyId),
]);

export const manufacturerInCatalog = catalog.table("manufacturer", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.manufacturer_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	name: text().notNull(),
	street: text(),
	postalCode: text("postal_code"),
	city: text(),
	department: text(),
	internalEmergencyPhone: text("internal_emergency_phone"),
	email: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	poisonCenterId: bigint("poison_center_id", { mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("manufacturer_name_idx").using("btree", sql`lower(name)`),
	foreignKey({
			columns: [table.poisonCenterId],
			foreignColumns: [poisonInformationCenterInCatalog.id],
			name: "manufacturer_poison_center_id_fkey"
		}),
	unique("manufacturer_legacy_id_key").on(table.legacyId),
]);

export const cleaningAgentInCatalog = catalog.table("cleaning_agent", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.cleaning_agent_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	name: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	manufacturerId: bigint("manufacturer_id", { mode: "number" }),
	operationsNumber: text("operations_number"),
	shortInfo: text("short_info"),
	measurementInstructions: text("measurement_instructions"),
	phValue: text("ph_value"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	storageClassId: bigint("storage_class_id", { mode: "number" }),
	waterHazardClass: smallint("water_hazard_class"),
	flammabilityClass: text("flammability_class"),
	adrRid: text("adr_rid"),
	hazardLegacyText: text("hazard_legacy_text"),
	precautionLegacyText: text("precaution_legacy_text"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("cleaning_agent_manufacturer_idx").using("btree", table.manufacturerId.asc().nullsLast().op("int8_ops")),
	index("cleaning_agent_name_idx").using("btree", sql`lower(name)`),
	foreignKey({
			columns: [table.manufacturerId],
			foreignColumns: [manufacturerInCatalog.id],
			name: "cleaning_agent_manufacturer_id_fkey"
		}),
	foreignKey({
			columns: [table.storageClassId],
			foreignColumns: [storageClassInCatalog.id],
			name: "cleaning_agent_storage_class_id_fkey"
		}),
	unique("cleaning_agent_legacy_id_key").on(table.legacyId),
	check("cleaning_agent_water_hazard_class_check", sql`(water_hazard_class >= 1) AND (water_hazard_class <= 3)`),
]);

export const storageClassInCatalog = catalog.table("storage_class", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.storage_class_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	code: text().notNull(),
	description: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("storage_class_legacy_id_key").on(table.legacyId),
	unique("storage_class_code_key").on(table.code),
]);

export const cleaningAgentHazardSubstanceInCatalog = catalog.table("cleaning_agent_hazard_substance", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.cleaning_agent_hazard_substance_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	cleaningAgentId: bigint("cleaning_agent_id", { mode: "number" }).notNull(),
	position: smallint().notNull(),
	substanceName: text("substance_name").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cleaningAgentId],
			foreignColumns: [cleaningAgentInCatalog.id],
			name: "cleaning_agent_hazard_substance_cleaning_agent_id_fkey"
		}).onDelete("cascade"),
	unique("cleaning_agent_hazard_substance_cleaning_agent_id_position_key").on(table.cleaningAgentId, table.position),
	check("cleaning_agent_hazard_substance_position_check", sql`("position" >= 1) AND ("position" <= 10)`),
]);

export const hazardSymbolInCatalog = catalog.table("hazard_symbol", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.hazard_symbol_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	// TODO: failed to parse database type 'bytea'
	pictogram: text("pictogram"),
	pictogramMime: text("pictogram_mime"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("hazard_symbol_legacy_id_key").on(table.legacyId),
	unique("hazard_symbol_code_key").on(table.code),
	check("hazard_symbol_code_check", sql`code ~ '^GHS[0-9]{2}$|^[A-Za-z][A-Za-z0-9]*$'::text`),
]);

export const ppeSymbolInCatalog = catalog.table("ppe_symbol", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.ppe_symbol_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	// TODO: failed to parse database type 'bytea'
	pictogram: text("pictogram"),
	pictogramMime: text("pictogram_mime"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("ppe_symbol_legacy_id_key").on(table.legacyId),
	unique("ppe_symbol_code_key").on(table.code),
]);

export const hazardPhraseMetaInCatalog = catalog.table("hazard_phrase_meta", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.hazard_phrase_meta_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	revision: text().notNull(),
	sourceShort: text("source_short").notNull(),
	sourceLong: text("source_long").notNull(),
	publishedAt: date("published_at"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("hazard_phrase_meta_legacy_id_key").on(table.legacyId),
]);

export const hygienePlanInCatalog = catalog.table("hygiene_plan", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.hygiene_plan_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	planNumber: integer("plan_number").notNull(),
	code: text().notNull(),
	title: text().notNull(),
	recommendedAgentText: text("recommended_agent_text"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("hygiene_plan_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	unique("hygiene_plan_legacy_id_key").on(table.legacyId),
	unique("hygiene_plan_plan_number_key").on(table.planNumber),
]);

export const hygienePlanStepInCatalog = catalog.table("hygiene_plan_step", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.hygiene_plan_step_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hygienePlanId: bigint("hygiene_plan_id", { mode: "number" }).notNull(),
	stepNumber: integer("step_number").notNull(),
	status: text(),
	taskDescription: text("task_description").notNull(),
	procedure: text(),
	equipment: text(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("hygiene_plan_step_plan_idx").using("btree", table.hygienePlanId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.hygienePlanId],
			foreignColumns: [hygienePlanInCatalog.id],
			name: "hygiene_plan_step_hygiene_plan_id_fkey"
		}).onDelete("cascade"),
	unique("hygiene_plan_step_hygiene_plan_id_step_number_key").on(table.hygienePlanId, table.stepNumber),
]);

export const hazardSubstanceInCatalog = catalog.table("hazard_substance", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.hazard_substance_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	name: text().notNull(),
	sdsDocumentPath: text("sds_document_path"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("hazard_substance_name_idx").using("btree", sql`lower(name)`),
	unique("hazard_substance_legacy_id_key").on(table.legacyId),
]);

export const hazardFactorInCatalog = catalog.table("hazard_factor", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "catalog.hazard_factor_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	code: text().notNull(),
	name: text().notNull(),
	parentCode: text("parent_code"),
	isCategory: boolean("is_category").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("hazard_factor_parent_idx").using("btree", table.parentCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parentCode],
			foreignColumns: [table.code],
			name: "hazard_factor_parent_code_fkey"
		}),
	unique("hazard_factor_legacy_id_key").on(table.legacyId),
	unique("hazard_factor_code_key").on(table.code),
]);

export const businessUnitInCore = core.table("business_unit", {
	id: smallint().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
}, (table) => [
	unique("business_unit_code_key").on(table.code),
]);

export const customerInCore = core.table("customer", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "customer_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id").notNull(),
	businessUnitId: smallint("business_unit_id").notNull(),
	cleaningGroup: integer("cleaning_group").notNull(),
	customerNumber: integer("customer_number").notNull(),
	name: text().notNull(),
	nameSupplement: text("name_supplement"),
	street: text(),
	postalCode: text("postal_code"),
	city: text(),
	federalState: text("federal_state"),
	phone: text(),
	fax: text(),
	supervisor: text(),
	teamLead: text("team_lead"),
	hourSheetFormat: text("hour_sheet_format"),
	matchCode: text("match_code"),
	cleaningAgentFreetext: text("cleaning_agent_freetext"),
	disinfectantFreetext: text("disinfectant_freetext"),
	flatRateBilling: boolean("flat_rate_billing").default(false).notNull(),
	extraWorkAllowed: boolean("extra_work_allowed").default(false).notNull(),
	swabTestsRequired: boolean("swab_tests_required").default(false).notNull(),
	weeklyAudit: boolean("weekly_audit").default(false).notNull(),
	monthlyAudit: boolean("monthly_audit").default(false).notNull(),
	vacationAudit: boolean("vacation_audit").default(false).notNull(),
	sicknessAudit: boolean("sickness_audit").default(false).notNull(),
	tag1: text("tag_1"),
	tag2: text("tag_2"),
	tag3: text("tag_3"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customer_business_unit_idx").using("btree", table.businessUnitId.asc().nullsLast().op("int2_ops")),
	index("customer_match_code_idx").using("btree", table.matchCode.asc().nullsLast().op("text_ops")),
	index("customer_name_idx").using("btree", sql`lower(name)`),
	foreignKey({
			columns: [table.businessUnitId],
			foreignColumns: [businessUnitInCore.id],
			name: "customer_business_unit_id_fkey"
		}),
	unique("customer_business_unit_id_customer_number_key").on(table.businessUnitId, table.customerNumber),
]);

export const customerContactPersonInCore = core.table("customer_contact_person", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "customer_contact_person_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }).notNull(),
	salutation: text(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	position: text(),
	email: text(),
	phone: text(),
	fax: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customer_contact_person_customer_idx").using("btree", table.customerId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customerInCore.id],
			name: "customer_contact_person_customer_id_fkey"
		}).onDelete("cascade"),
]);

export const countryInCore = core.table("country", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "country_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	name: text().notNull(),
}, (table) => [
	unique("country_legacy_id_key").on(table.legacyId),
	unique("country_name_key").on(table.name),
]);

export const microbiologicalLabInCore = core.table("microbiological_lab", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "microbiological_lab_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	name: text().notNull(),
}, (table) => [
	unique("microbiological_lab_legacy_id_key").on(table.legacyId),
]);

export const publicHolidayInCore = core.table("public_holiday", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "public_holiday_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id"),
	holidayDate: date("holiday_date").notNull(),
	name: text().notNull(),
	fixedDate: boolean("fixed_date").default(false).notNull(),
	regionCode: smallint("region_code"),
	notes: text(),
}, (table) => [
	index("public_holiday_date_idx").using("btree", table.holidayDate.asc().nullsLast().op("date_ops")),
	unique("public_holiday_legacy_id_key").on(table.legacyId),
]);

export const federalStateInCore = core.table("federal_state", {
	id: smallint().primaryKey().notNull(),
	legacyId: text("legacy_id"),
	name: text().notNull(),
	abbreviation: text().notNull(),
	isGermanState: boolean("is_german_state").notNull(),
}, (table) => [
	unique("federal_state_legacy_id_key").on(table.legacyId),
	unique("federal_state_abbreviation_key").on(table.abbreviation),
]);

export const departmentInOps = ops.table("department", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "department_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }).notNull(),
	departmentNumber: integer("department_number").notNull(),
	name: text().notNull(),
	floor: text(),
	areaNumber: smallint("area_number"),
	areaName: text("area_name"),
	customerDepartmentNumber: text("customer_department_number"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("department_customer_idx").using("btree", table.customerId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customerInCore.id],
			name: "department_customer_id_fkey"
		}),
	unique("department_customer_id_department_number_key").on(table.customerId, table.departmentNumber),
]);

export const departmentObjectInOps = ops.table("department_object", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "department_object_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	departmentId: bigint("department_id", { mode: "number" }).notNull(),
	objectNumber: text("object_number"),
	name: text().notNull(),
	quantityText: text("quantity_text"),
	executionCount: smallint("execution_count"),
	executionType: text("execution_type"),
	executionCode: text("execution_code"),
	cleaningMethod: text("cleaning_method"),
	additionalWork: boolean("additional_work"),
	controlInterval: text("control_interval"),
	kFactor: text("k_factor"),
	mondayCount: smallint("monday_count"),
	mondayCode: text("monday_code"),
	tuesdayCount: smallint("tuesday_count"),
	tuesdayCode: text("tuesday_code"),
	wednesdayCount: smallint("wednesday_count"),
	wednesdayCode: text("wednesday_code"),
	thursdayCount: smallint("thursday_count"),
	thursdayCode: text("thursday_code"),
	fridayCount: smallint("friday_count"),
	fridayCode: text("friday_code"),
	saturdayCount: smallint("saturday_count"),
	saturdayCode: text("saturday_code"),
	sundayCount: smallint("sunday_count"),
	sundayCode: text("sunday_code"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("department_object_dept_idx").using("btree", table.departmentId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departmentInOps.id],
			name: "department_object_department_id_fkey"
		}).onDelete("cascade"),
	unique("department_object_department_id_legacy_id_key").on(table.legacyId, table.departmentId),
]);

export const customerHygienePlanInOps = ops.table("customer_hygiene_plan", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "customer_hygiene_plan_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	masterHygienePlanId: bigint("master_hygiene_plan_id", { mode: "number" }),
	planNumber: integer("plan_number").notNull(),
	code: text(),
	title: text().notNull(),
	recommendedAgentText: text("recommended_agent_text"),
	legacyAttributes: jsonb("legacy_attributes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customer_hygiene_plan_customer_idx").using("btree", table.customerId.asc().nullsLast().op("int8_ops")),
	index("customer_hygiene_plan_master_idx").using("btree", table.masterHygienePlanId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customerInCore.id],
			name: "customer_hygiene_plan_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.masterHygienePlanId],
			foreignColumns: [hygienePlanInCatalog.id],
			name: "customer_hygiene_plan_master_hygiene_plan_id_fkey"
		}),
	unique("customer_hygiene_plan_customer_id_plan_number_key").on(table.customerId, table.planNumber),
]);

export const customerHygienePlanStepInOps = ops.table("customer_hygiene_plan_step", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "customer_hygiene_plan_step_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerHygienePlanId: bigint("customer_hygiene_plan_id", { mode: "number" }).notNull(),
	stepNumber: integer("step_number").notNull(),
	status: text(),
	taskDescription: text("task_description"),
	procedure: text(),
	equipment: text(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customer_hygiene_plan_step_plan_idx").using("btree", table.customerHygienePlanId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.customerHygienePlanId],
			foreignColumns: [customerHygienePlanInOps.id],
			name: "customer_hygiene_plan_step_customer_hygiene_plan_id_fkey"
		}).onDelete("cascade"),
	unique("customer_hygiene_plan_step_customer_hygiene_plan_id_step_nu_key").on(table.customerHygienePlanId, table.stepNumber),
]);

export const workInstructionInOps = ops.table("work_instruction", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "work_instruction_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	departmentId: bigint("department_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	departmentObjectId: bigint("department_object_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerHygienePlanId: bigint("customer_hygiene_plan_id", { mode: "number" }),
	departmentNumberSnapshot: integer("department_number_snapshot"),
	departmentNameSnapshot: text("department_name_snapshot"),
	objectNumberSnapshot: text("object_number_snapshot"),
	objectNameSnapshot: text("object_name_snapshot"),
	planNumberSnapshot: integer("plan_number_snapshot"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("work_instruction_customer_idx").using("btree", table.customerId.asc().nullsLast().op("int8_ops")),
	index("work_instruction_object_idx").using("btree", table.departmentObjectId.asc().nullsLast().op("int8_ops")),
	index("work_instruction_plan_idx").using("btree", table.customerHygienePlanId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customerInCore.id],
			name: "work_instruction_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departmentInOps.id],
			name: "work_instruction_department_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.departmentObjectId],
			foreignColumns: [departmentObjectInOps.id],
			name: "work_instruction_department_object_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.customerHygienePlanId],
			foreignColumns: [customerHygienePlanInOps.id],
			name: "work_instruction_customer_hygiene_plan_id_fkey"
		}),
	unique("work_instruction_customer_id_legacy_id_key").on(table.legacyId, table.customerId),
]);

export const customerHazardSubstanceInOps = ops.table("customer_hazard_substance", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "customer_hazard_substance_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	masterHazardSubstanceId: bigint("master_hazard_substance_id", { mode: "number" }),
	name: text().notNull(),
	location: text(),
	annualQuantityText: text("annual_quantity_text"),
	sdsDocumentPath: text("sds_document_path"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customer_hazard_substance_customer_idx").using("btree", table.customerId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customerInCore.id],
			name: "customer_hazard_substance_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.masterHazardSubstanceId],
			foreignColumns: [hazardSubstanceInCatalog.id],
			name: "customer_hazard_substance_master_hazard_substance_id_fkey"
		}),
	unique("customer_hazard_substance_customer_id_legacy_id_key").on(table.legacyId, table.customerId),
]);

export const controlIntervalInOps = ops.table("control_interval", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "control_interval_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }).notNull(),
	intervalCode: integer("interval_code").notNull(),
	name: text().notNull(),
	correctionFactor: numeric("correction_factor", { precision: 10, scale:  3 }),
	executionCount: smallint("execution_count"),
	intervalText: text("interval_text"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customerInCore.id],
			name: "control_interval_customer_id_fkey"
		}),
	unique("control_interval_customer_id_interval_code_key").on(table.customerId, table.intervalCode),
]);

export const hygieneControlPlanInOps = ops.table("hygiene_control_plan", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hygiene_control_plan_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	legacyId: text("legacy_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	departmentId: bigint("department_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	departmentObjectId: bigint("department_object_id", { mode: "number" }),
	controlType: hygieneControlTypeInOps("control_type").notNull(),
	departmentNumberSnapshot: integer("department_number_snapshot"),
	objectNumberSnapshot: text("object_number_snapshot"),
	intervalCount: smallint("interval_count"),
	intervalLabel: text("interval_label"),
	controlCount: smallint("control_count"),
	quantityText: text("quantity_text"),
	responsibleParty: responsiblePartyInOps("responsible_party").notNull(),
	areaNumber: smallint("area_number"),
	areaName: text("area_name"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerHygienePlanId: bigint("customer_hygiene_plan_id", { mode: "number" }),
	planTextSnapshot: text("plan_text_snapshot"),
	weekdaySchedule: jsonb("weekday_schedule"),
	legacyAttributes: jsonb("legacy_attributes"),
}, (table) => [
	index("hygiene_control_plan_chp_idx").using("btree", table.customerHygienePlanId.asc().nullsLast().op("int8_ops")),
	index("hygiene_control_plan_customer_idx").using("btree", table.customerId.asc().nullsLast().op("int8_ops")),
	index("hygiene_control_plan_department_idx").using("btree", table.departmentId.asc().nullsLast().op("int8_ops")),
	index("hygiene_control_plan_legacy_idx").using("btree", table.legacyId.asc().nullsLast().op("text_ops")),
	index("hygiene_control_plan_object_idx").using("btree", table.departmentObjectId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customerInCore.id],
			name: "hygiene_control_plan_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departmentInOps.id],
			name: "hygiene_control_plan_department_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.departmentObjectId],
			foreignColumns: [departmentObjectInOps.id],
			name: "hygiene_control_plan_department_object_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.customerHygienePlanId],
			foreignColumns: [customerHygienePlanInOps.id],
			name: "hygiene_control_plan_customer_hygiene_plan_id_fkey"
		}).onDelete("set null"),
	unique("hygiene_control_plan_legacy_id_key").on(table.legacyId),
]);

export const cleaningAgentHazardPhraseInCatalog = catalog.table("cleaning_agent_hazard_phrase", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	cleaningAgentId: bigint("cleaning_agent_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hazardPhraseId: bigint("hazard_phrase_id", { mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cleaningAgentId],
			foreignColumns: [cleaningAgentInCatalog.id],
			name: "cleaning_agent_hazard_phrase_cleaning_agent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.hazardPhraseId],
			foreignColumns: [hazardPhraseInCatalog.id],
			name: "cleaning_agent_hazard_phrase_hazard_phrase_id_fkey"
		}),
	primaryKey({ columns: [table.cleaningAgentId, table.hazardPhraseId], name: "cleaning_agent_hazard_phrase_pkey"}),
]);

export const cleaningAgentHazardSymbolInCatalog = catalog.table("cleaning_agent_hazard_symbol", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	cleaningAgentId: bigint("cleaning_agent_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hazardSymbolId: bigint("hazard_symbol_id", { mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cleaningAgentId],
			foreignColumns: [cleaningAgentInCatalog.id],
			name: "cleaning_agent_hazard_symbol_cleaning_agent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.hazardSymbolId],
			foreignColumns: [hazardSymbolInCatalog.id],
			name: "cleaning_agent_hazard_symbol_hazard_symbol_id_fkey"
		}),
	primaryKey({ columns: [table.cleaningAgentId, table.hazardSymbolId], name: "cleaning_agent_hazard_symbol_pkey"}),
]);

export const cleaningAgentPpeSymbolInCatalog = catalog.table("cleaning_agent_ppe_symbol", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	cleaningAgentId: bigint("cleaning_agent_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	ppeSymbolId: bigint("ppe_symbol_id", { mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cleaningAgentId],
			foreignColumns: [cleaningAgentInCatalog.id],
			name: "cleaning_agent_ppe_symbol_cleaning_agent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ppeSymbolId],
			foreignColumns: [ppeSymbolInCatalog.id],
			name: "cleaning_agent_ppe_symbol_ppe_symbol_id_fkey"
		}),
	primaryKey({ columns: [table.cleaningAgentId, table.ppeSymbolId], name: "cleaning_agent_ppe_symbol_pkey"}),
]);

export const publicHolidayFederalStateInCore = core.table("public_holiday_federal_state", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	publicHolidayId: bigint("public_holiday_id", { mode: "number" }).notNull(),
	federalStateId: smallint("federal_state_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.publicHolidayId],
			foreignColumns: [publicHolidayInCore.id],
			name: "public_holiday_federal_state_public_holiday_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.federalStateId],
			foreignColumns: [federalStateInCore.id],
			name: "public_holiday_federal_state_federal_state_id_fkey"
		}),
	primaryKey({ columns: [table.publicHolidayId, table.federalStateId], name: "public_holiday_federal_state_pkey"}),
]);
