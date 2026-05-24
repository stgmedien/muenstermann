import { relations } from "drizzle-orm/relations";
import { hazardPhraseCategoryInCatalog, hazardPhraseInCatalog, poisonInformationCenterInCatalog, manufacturerInCatalog, cleaningAgentInCatalog, storageClassInCatalog, cleaningAgentHazardSubstanceInCatalog, hygienePlanInCatalog, hygienePlanStepInCatalog, hazardFactorInCatalog, businessUnitInCore, customerInCore, customerContactPersonInCore, departmentInOps, departmentObjectInOps, customerHygienePlanInOps, customerHygienePlanStepInOps, workInstructionInOps, customerHazardSubstanceInOps, hazardSubstanceInCatalog, controlIntervalInOps, hygieneControlPlanInOps, cleaningAgentHazardPhraseInCatalog, cleaningAgentHazardSymbolInCatalog, hazardSymbolInCatalog, cleaningAgentPpeSymbolInCatalog, ppeSymbolInCatalog, publicHolidayInCore, publicHolidayFederalStateInCore, federalStateInCore } from "./schema";

export const hazardPhraseInCatalogRelations = relations(hazardPhraseInCatalog, ({one, many}) => ({
	hazardPhraseCategoryInCatalog: one(hazardPhraseCategoryInCatalog, {
		fields: [hazardPhraseInCatalog.categoryId],
		references: [hazardPhraseCategoryInCatalog.id]
	}),
	cleaningAgentHazardPhraseInCatalogs: many(cleaningAgentHazardPhraseInCatalog),
}));

export const hazardPhraseCategoryInCatalogRelations = relations(hazardPhraseCategoryInCatalog, ({many}) => ({
	hazardPhraseInCatalogs: many(hazardPhraseInCatalog),
}));

export const manufacturerInCatalogRelations = relations(manufacturerInCatalog, ({one, many}) => ({
	poisonInformationCenterInCatalog: one(poisonInformationCenterInCatalog, {
		fields: [manufacturerInCatalog.poisonCenterId],
		references: [poisonInformationCenterInCatalog.id]
	}),
	cleaningAgentInCatalogs: many(cleaningAgentInCatalog),
}));

export const poisonInformationCenterInCatalogRelations = relations(poisonInformationCenterInCatalog, ({many}) => ({
	manufacturerInCatalogs: many(manufacturerInCatalog),
}));

export const cleaningAgentInCatalogRelations = relations(cleaningAgentInCatalog, ({one, many}) => ({
	manufacturerInCatalog: one(manufacturerInCatalog, {
		fields: [cleaningAgentInCatalog.manufacturerId],
		references: [manufacturerInCatalog.id]
	}),
	storageClassInCatalog: one(storageClassInCatalog, {
		fields: [cleaningAgentInCatalog.storageClassId],
		references: [storageClassInCatalog.id]
	}),
	cleaningAgentHazardSubstanceInCatalogs: many(cleaningAgentHazardSubstanceInCatalog),
	cleaningAgentHazardPhraseInCatalogs: many(cleaningAgentHazardPhraseInCatalog),
	cleaningAgentHazardSymbolInCatalogs: many(cleaningAgentHazardSymbolInCatalog),
	cleaningAgentPpeSymbolInCatalogs: many(cleaningAgentPpeSymbolInCatalog),
}));

export const storageClassInCatalogRelations = relations(storageClassInCatalog, ({many}) => ({
	cleaningAgentInCatalogs: many(cleaningAgentInCatalog),
}));

export const cleaningAgentHazardSubstanceInCatalogRelations = relations(cleaningAgentHazardSubstanceInCatalog, ({one}) => ({
	cleaningAgentInCatalog: one(cleaningAgentInCatalog, {
		fields: [cleaningAgentHazardSubstanceInCatalog.cleaningAgentId],
		references: [cleaningAgentInCatalog.id]
	}),
}));

export const hygienePlanStepInCatalogRelations = relations(hygienePlanStepInCatalog, ({one}) => ({
	hygienePlanInCatalog: one(hygienePlanInCatalog, {
		fields: [hygienePlanStepInCatalog.hygienePlanId],
		references: [hygienePlanInCatalog.id]
	}),
}));

export const hygienePlanInCatalogRelations = relations(hygienePlanInCatalog, ({many}) => ({
	hygienePlanStepInCatalogs: many(hygienePlanStepInCatalog),
	customerHygienePlanInOps: many(customerHygienePlanInOps),
}));

export const hazardFactorInCatalogRelations = relations(hazardFactorInCatalog, ({one, many}) => ({
	hazardFactorInCatalog: one(hazardFactorInCatalog, {
		fields: [hazardFactorInCatalog.parentCode],
		references: [hazardFactorInCatalog.code],
		relationName: "hazardFactorInCatalog_parentCode_hazardFactorInCatalog_code"
	}),
	hazardFactorInCatalogs: many(hazardFactorInCatalog, {
		relationName: "hazardFactorInCatalog_parentCode_hazardFactorInCatalog_code"
	}),
}));

export const customerInCoreRelations = relations(customerInCore, ({one, many}) => ({
	businessUnitInCore: one(businessUnitInCore, {
		fields: [customerInCore.businessUnitId],
		references: [businessUnitInCore.id]
	}),
	customerContactPersonInCores: many(customerContactPersonInCore),
	departmentInOps: many(departmentInOps),
	customerHygienePlanInOps: many(customerHygienePlanInOps),
	workInstructionInOps: many(workInstructionInOps),
	customerHazardSubstanceInOps: many(customerHazardSubstanceInOps),
	controlIntervalInOps: many(controlIntervalInOps),
	hygieneControlPlanInOps: many(hygieneControlPlanInOps),
}));

export const businessUnitInCoreRelations = relations(businessUnitInCore, ({many}) => ({
	customerInCores: many(customerInCore),
}));

export const customerContactPersonInCoreRelations = relations(customerContactPersonInCore, ({one}) => ({
	customerInCore: one(customerInCore, {
		fields: [customerContactPersonInCore.customerId],
		references: [customerInCore.id]
	}),
}));

export const departmentInOpsRelations = relations(departmentInOps, ({one, many}) => ({
	customerInCore: one(customerInCore, {
		fields: [departmentInOps.customerId],
		references: [customerInCore.id]
	}),
	departmentObjectInOps: many(departmentObjectInOps),
	workInstructionInOps: many(workInstructionInOps),
	hygieneControlPlanInOps: many(hygieneControlPlanInOps),
}));

export const departmentObjectInOpsRelations = relations(departmentObjectInOps, ({one, many}) => ({
	departmentInOp: one(departmentInOps, {
		fields: [departmentObjectInOps.departmentId],
		references: [departmentInOps.id]
	}),
	workInstructionInOps: many(workInstructionInOps),
	hygieneControlPlanInOps: many(hygieneControlPlanInOps),
}));

export const customerHygienePlanInOpsRelations = relations(customerHygienePlanInOps, ({one, many}) => ({
	customerInCore: one(customerInCore, {
		fields: [customerHygienePlanInOps.customerId],
		references: [customerInCore.id]
	}),
	hygienePlanInCatalog: one(hygienePlanInCatalog, {
		fields: [customerHygienePlanInOps.masterHygienePlanId],
		references: [hygienePlanInCatalog.id]
	}),
	customerHygienePlanStepInOps: many(customerHygienePlanStepInOps),
	workInstructionInOps: many(workInstructionInOps),
	hygieneControlPlanInOps: many(hygieneControlPlanInOps),
}));

export const customerHygienePlanStepInOpsRelations = relations(customerHygienePlanStepInOps, ({one}) => ({
	customerHygienePlanInOp: one(customerHygienePlanInOps, {
		fields: [customerHygienePlanStepInOps.customerHygienePlanId],
		references: [customerHygienePlanInOps.id]
	}),
}));

export const workInstructionInOpsRelations = relations(workInstructionInOps, ({one}) => ({
	customerInCore: one(customerInCore, {
		fields: [workInstructionInOps.customerId],
		references: [customerInCore.id]
	}),
	departmentInOp: one(departmentInOps, {
		fields: [workInstructionInOps.departmentId],
		references: [departmentInOps.id]
	}),
	departmentObjectInOp: one(departmentObjectInOps, {
		fields: [workInstructionInOps.departmentObjectId],
		references: [departmentObjectInOps.id]
	}),
	customerHygienePlanInOp: one(customerHygienePlanInOps, {
		fields: [workInstructionInOps.customerHygienePlanId],
		references: [customerHygienePlanInOps.id]
	}),
}));

export const customerHazardSubstanceInOpsRelations = relations(customerHazardSubstanceInOps, ({one}) => ({
	customerInCore: one(customerInCore, {
		fields: [customerHazardSubstanceInOps.customerId],
		references: [customerInCore.id]
	}),
	hazardSubstanceInCatalog: one(hazardSubstanceInCatalog, {
		fields: [customerHazardSubstanceInOps.masterHazardSubstanceId],
		references: [hazardSubstanceInCatalog.id]
	}),
}));

export const hazardSubstanceInCatalogRelations = relations(hazardSubstanceInCatalog, ({many}) => ({
	customerHazardSubstanceInOps: many(customerHazardSubstanceInOps),
}));

export const controlIntervalInOpsRelations = relations(controlIntervalInOps, ({one}) => ({
	customerInCore: one(customerInCore, {
		fields: [controlIntervalInOps.customerId],
		references: [customerInCore.id]
	}),
}));

export const hygieneControlPlanInOpsRelations = relations(hygieneControlPlanInOps, ({one}) => ({
	customerInCore: one(customerInCore, {
		fields: [hygieneControlPlanInOps.customerId],
		references: [customerInCore.id]
	}),
	departmentInOp: one(departmentInOps, {
		fields: [hygieneControlPlanInOps.departmentId],
		references: [departmentInOps.id]
	}),
	departmentObjectInOp: one(departmentObjectInOps, {
		fields: [hygieneControlPlanInOps.departmentObjectId],
		references: [departmentObjectInOps.id]
	}),
	customerHygienePlanInOp: one(customerHygienePlanInOps, {
		fields: [hygieneControlPlanInOps.customerHygienePlanId],
		references: [customerHygienePlanInOps.id]
	}),
}));

export const cleaningAgentHazardPhraseInCatalogRelations = relations(cleaningAgentHazardPhraseInCatalog, ({one}) => ({
	cleaningAgentInCatalog: one(cleaningAgentInCatalog, {
		fields: [cleaningAgentHazardPhraseInCatalog.cleaningAgentId],
		references: [cleaningAgentInCatalog.id]
	}),
	hazardPhraseInCatalog: one(hazardPhraseInCatalog, {
		fields: [cleaningAgentHazardPhraseInCatalog.hazardPhraseId],
		references: [hazardPhraseInCatalog.id]
	}),
}));

export const cleaningAgentHazardSymbolInCatalogRelations = relations(cleaningAgentHazardSymbolInCatalog, ({one}) => ({
	cleaningAgentInCatalog: one(cleaningAgentInCatalog, {
		fields: [cleaningAgentHazardSymbolInCatalog.cleaningAgentId],
		references: [cleaningAgentInCatalog.id]
	}),
	hazardSymbolInCatalog: one(hazardSymbolInCatalog, {
		fields: [cleaningAgentHazardSymbolInCatalog.hazardSymbolId],
		references: [hazardSymbolInCatalog.id]
	}),
}));

export const hazardSymbolInCatalogRelations = relations(hazardSymbolInCatalog, ({many}) => ({
	cleaningAgentHazardSymbolInCatalogs: many(cleaningAgentHazardSymbolInCatalog),
}));

export const cleaningAgentPpeSymbolInCatalogRelations = relations(cleaningAgentPpeSymbolInCatalog, ({one}) => ({
	cleaningAgentInCatalog: one(cleaningAgentInCatalog, {
		fields: [cleaningAgentPpeSymbolInCatalog.cleaningAgentId],
		references: [cleaningAgentInCatalog.id]
	}),
	ppeSymbolInCatalog: one(ppeSymbolInCatalog, {
		fields: [cleaningAgentPpeSymbolInCatalog.ppeSymbolId],
		references: [ppeSymbolInCatalog.id]
	}),
}));

export const ppeSymbolInCatalogRelations = relations(ppeSymbolInCatalog, ({many}) => ({
	cleaningAgentPpeSymbolInCatalogs: many(cleaningAgentPpeSymbolInCatalog),
}));

export const publicHolidayFederalStateInCoreRelations = relations(publicHolidayFederalStateInCore, ({one}) => ({
	publicHolidayInCore: one(publicHolidayInCore, {
		fields: [publicHolidayFederalStateInCore.publicHolidayId],
		references: [publicHolidayInCore.id]
	}),
	federalStateInCore: one(federalStateInCore, {
		fields: [publicHolidayFederalStateInCore.federalStateId],
		references: [federalStateInCore.id]
	}),
}));

export const publicHolidayInCoreRelations = relations(publicHolidayInCore, ({many}) => ({
	publicHolidayFederalStateInCores: many(publicHolidayFederalStateInCore),
}));

export const federalStateInCoreRelations = relations(federalStateInCore, ({many}) => ({
	publicHolidayFederalStateInCores: many(publicHolidayFederalStateInCore),
}));