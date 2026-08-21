import type { CustomRoute } from '@elegant-router/types';
import { layouts, views } from '../elegant/imports';
import { transformElegantRoutesToVueRoutes } from '../elegant/transform';

const FORM_DESIGNER_PERMISSIONS = ['PAGE_FORM_DESIGNER.ADMIN', 'PAGE_FORM_DESIGNER.HR', 'PAGE_FORM_DESIGNER.IT', 'PAGE_FORM_DESIGNER.GA'];

export const ROOT_ROUTE: CustomRoute = {
  name: 'root',
  path: '/',
  redirect: '/airway/portal',
  meta: { title: 'root', constant: true }
};

const AIRWAY_PORTAL_ROUTE: CustomRoute = { name: 'airway-portal', path: '/airway/portal', component: 'layout.base$view.airway_portal', meta: { title: 'Demo OA', constant: true } };
const AIRWAY_DASHBOARD_ROUTE: CustomRoute = { name: 'airway-dashboard', path: '/airway/dashboard', component: 'layout.base$view.airway_dashboard', meta: { title: 'Dashboard', constant: true } };
const AIRWAY_DEPARTMENTS_ROUTE: CustomRoute = { name: 'airway-departments', path: '/airway/departments', component: 'layout.base$view.airway_departments', meta: { title: '組織架構', constant: true } };
const AIRWAY_EMPLOYEES_ROUTE: CustomRoute = { name: 'airway-employees', path: '/airway/employees', component: 'layout.base$view.airway_employees', meta: { title: '員工管理', constant: true } };
const AIRWAY_EMPLOYEE_IMPORT_ROUTE: CustomRoute = { name: 'airway-employee-import', path: '/airway/employee-import', component: 'layout.base$view.airway_employee_import', meta: { title: '人員資料匯入', constant: true } };
const AIRWAY_PROFILE_ROUTE: CustomRoute = { name: 'airway-profile', path: '/airway/profile', component: 'layout.base$view.airway_profile', meta: { title: '個人資訊', constant: true } };
const AIRWAY_TEST_ROUTE: CustomRoute = { name: 'airway-test', path: '/airway/test', component: 'layout.base$view.airway_test', meta: { title: 'API 測試', constant: true } };
const AIRWAY_AD_PERMISSIONS_ROUTE: CustomRoute = { name: 'airway-ad-permissions', path: '/airway/ad-permissions', component: 'layout.base$view.airway_ad-permissions', meta: { title: 'AD權限', constant: true } };
const AIRWAY_PERMISSIONS_ROUTE: CustomRoute = { name: 'airway-permissions', path: '/airway/permissions', component: 'layout.base$view.airway_permissions', meta: { title: '權限控管', constant: true } };

const AIRWAY_ASSETS_ROUTE: CustomRoute = { name: 'airway-assets', path: '/airway/assets', redirect: '/airway/assets/laptops', meta: { title: '資產管理', constant: true } };
const AIRWAY_ASSETS_LAPTOPS_ROUTE: CustomRoute = { name: 'airway-assets-laptops', path: '/airway/assets/laptops', component: 'layout.base$view.airway_assets', meta: { title: '筆電', constant: true } };
const AIRWAY_ASSETS_MONITORS_ROUTE: CustomRoute = { name: 'airway-assets-monitors', path: '/airway/assets/monitors', component: 'layout.base$view.airway_assets', meta: { title: '螢幕', constant: true } };
const AIRWAY_ASSETS_OFFICE_ELECTRONIC_ROUTE: CustomRoute = { name: 'airway-assets-office-electronic', path: '/airway/assets/office-electronic', component: 'layout.base$view.airway_assets', meta: { title: '其他辦公設備 / 電子設備', constant: true } };
const AIRWAY_ASSETS_OFFICE_NONELECTRONIC_ROUTE: CustomRoute = { name: 'airway-assets-office-nonelectronic', path: '/airway/assets/office-nonelectronic', component: 'layout.base$view.airway_assets', meta: { title: '其他辦公設備 / 非電子設備', constant: true } };
const AIRWAY_ASSETS_MACHINES_ROUTE: CustomRoute = { name: 'airway-assets-machines', path: '/airway/assets/machines', component: 'layout.base$view.airway_assets', meta: { title: '機器設備', constant: true } };
const AIRWAY_ASSETS_INTAKE_ROUTE: CustomRoute = { name: 'airway-assets-intake', path: '/airway/assets/intake', component: 'layout.base$view.airway_assets_intake', meta: { title: '資產填寫入口', constant: true } };
const AIRWAY_ASSETS_NEW_ROUTE: CustomRoute = { name: 'airway-assets-new', path: '/airway/assets/new', component: 'layout.base$view.airway_assets_new', meta: { title: '新增資產', constant: true } };
const AIRWAY_ASSETS_DETAIL_ROUTE: CustomRoute = { name: 'airway-assets-detail', path: '/airway/assets/detail/:assetNo', component: 'layout.base$view.airway_assets_detail', meta: { title: '資產詳情', constant: true } };

const AIRWAY_ACCOUNTS_ROUTE: CustomRoute = { name: 'airway-accounts', path: '/airway/accounts', redirect: '/airway/accounts/gws', meta: { title: '帳號管理', constant: true } };
const AIRWAY_ACCOUNTS_GWS_ROUTE: CustomRoute = { name: 'airway-accounts-gws', path: '/airway/accounts/gws', component: 'layout.base$view.airway_accounts', meta: { title: 'GWS', constant: true } };
const AIRWAY_ACCOUNTS_AWS_ROUTE: CustomRoute = { name: 'airway-accounts-aws', path: '/airway/accounts/aws', component: 'layout.base$view.airway_accounts', meta: { title: 'AWS', constant: true } };
const AIRWAY_ACCOUNTS_M365_ROUTE: CustomRoute = { name: 'airway-accounts-m365', path: '/airway/accounts/m365', component: 'layout.base$view.airway_accounts', meta: { title: 'M365', constant: true } };
const AIRWAY_ACCOUNTS_NEW_ROUTE: CustomRoute = { name: 'airway-accounts-new', path: '/airway/accounts/new', component: 'layout.base$view.airway_accounts_new', meta: { title: '新增帳號', constant: true } };
const AIRWAY_ACCOUNTS_DETAIL_ROUTE: CustomRoute = { name: 'airway-accounts-detail', path: '/airway/accounts/detail/:id', component: 'layout.base$view.airway_accounts_detail', meta: { title: '帳號詳情', constant: true } };

const LEGACY_ASSETS_M365_ROUTE: CustomRoute = { name: 'airway-assets-m365', path: '/airway/assets/m365', redirect: '/airway/accounts/m365', meta: { title: 'M365 帳號', constant: true } };

const AIRWAY_FORMS_ROUTE: CustomRoute = { name: 'airway-forms', path: '/airway/forms', component: 'layout.base$view.airway_forms', meta: { title: '發起申請', constant: true } };
const AIRWAY_FORMS_APPLY_ROUTE: CustomRoute = { name: 'airway-forms-apply', path: '/airway/forms/apply/:id', component: 'layout.base$view.airway_forms_apply', meta: { title: '填寫申請', constant: true } };
const AIRWAY_FORMS_APPLY_INDEX_ROUTE: CustomRoute = { name: 'airway-forms-apply-index', path: '/airway/forms/apply', redirect: '/airway/forms', meta: { title: '發起申請', constant: true } };
const AIRWAY_FORMS_CENTER_ROUTE: CustomRoute = { name: 'airway-forms-center', path: '/airway/forms/center', component: 'layout.base$view.airway_forms_center', meta: { title: '審核中心', constant: true } };
const AIRWAY_FORMS_DETAIL_ROUTE: CustomRoute = { name: 'airway-forms-detail', path: '/airway/forms/detail/:id', component: 'layout.base$view.airway_forms_detail', meta: { title: '申請詳情', constant: true } };
const AIRWAY_FORMS_DESIGNER_ROUTE: CustomRoute = { name: 'airway-forms-designer', path: '/airway/forms/designer', component: 'layout.base$view.airway_forms_designer', meta: { title: '審批管理後台', constant: true, permissions: FORM_DESIGNER_PERMISSIONS } };
const AIRWAY_FORMS_DESIGNER_EDIT_ROUTE: CustomRoute = { name: 'airway-forms-designer-edit', path: '/airway/forms/designer/edit/:id', component: 'layout.base$view.airway_forms_designer_edit', meta: { title: '審批流程控制中心', constant: true, permissions: FORM_DESIGNER_PERMISSIONS } };
const AIRWAY_FORMS_DATA_ROUTE: CustomRoute = { name: 'airway-forms-data', path: '/airway/forms/data', component: 'layout.base$view.airway_forms_data', meta: { title: '數據管理', constant: true, permissions: FORM_DESIGNER_PERMISSIONS } };
const AIRWAY_FORMS_PERMISSIONS_ROUTE: CustomRoute = { name: 'airway-forms-permissions', path: '/airway/forms/permissions', component: 'layout.base$view.airway_forms_permissions', meta: { title: '審批權限管理', constant: true, permissions: FORM_DESIGNER_PERMISSIONS } };

const LEGACY_AIRWAY_PORTAL_ROUTE: CustomRoute = { name: 'legacy-airway-portal', path: '/airway-portal', redirect: '/airway/portal', meta: { title: 'Demo OA', constant: true } };
const LEGACY_AIRWAY_DASHBOARD_ROUTE: CustomRoute = { name: 'legacy-airway-dashboard', path: '/airway-dashboard', redirect: '/airway/dashboard', meta: { title: 'Dashboard', constant: true } };
const LEGACY_AIRWAY_DEPARTMENTS_ROUTE: CustomRoute = { name: 'legacy-airway-departments', path: '/airway-departments', redirect: '/airway/departments', meta: { title: '組織架構', constant: true } };
const LEGACY_AIRWAY_EMPLOYEES_ROUTE: CustomRoute = { name: 'legacy-airway-employees', path: '/airway-employees', redirect: '/airway/employees', meta: { title: '員工管理', constant: true } };
const LEGACY_AIRWAY_EMPLOYEE_IMPORT_ROUTE: CustomRoute = { name: 'legacy-airway-employee-import', path: '/airway-employee-import', redirect: '/airway/employee-import', meta: { title: '人員資料匯入', constant: true } };
const LEGACY_AIRWAY_TEST_ROUTE: CustomRoute = { name: 'legacy-airway-test', path: '/airway-test', redirect: '/airway/test', meta: { title: 'API 測試', constant: true } };
const LEGACY_FORMS_HR_ROUTE: CustomRoute = { name: 'airway-forms-hr', path: '/airway/forms/hr', redirect: '/airway/forms', meta: { title: '發起申請', constant: true } };
const LEGACY_FORMS_IT_ROUTE: CustomRoute = { name: 'airway-forms-it', path: '/airway/forms/it', redirect: '/airway/forms', meta: { title: '發起申請', constant: true } };
const LEGACY_FORMS_GA_ROUTE: CustomRoute = { name: 'airway-forms-ga', path: '/airway/forms/ga', redirect: '/airway/forms', meta: { title: '發起申請', constant: true } };
const LEGACY_APPROVAL_APPLY_ROUTE: CustomRoute = { name: 'legacy-airway-approval-apply', path: '/airway/approval/apply', redirect: '/airway/forms', meta: { title: '發起申請', constant: true } };
const LEGACY_APPROVAL_CENTER_ROUTE: CustomRoute = { name: 'legacy-airway-approval-center', path: '/airway/approval/center', redirect: '/airway/forms/center', meta: { title: '審核中心', constant: true } };
const LEGACY_APPROVAL_TEMPLATES_ROUTE: CustomRoute = { name: 'legacy-airway-approval-templates', path: '/airway/approval/templates', redirect: '/airway/forms/designer', meta: { title: '審批管理後台', constant: true } };

const NOT_FOUND_ROUTE: CustomRoute = { name: 'not-found', path: '/:pathMatch(.*)*', component: 'layout.blank$view.404', meta: { title: 'not-found', constant: true } };

const builtinRoutes: CustomRoute[] = [
  ROOT_ROUTE,
  AIRWAY_PORTAL_ROUTE,
  AIRWAY_DASHBOARD_ROUTE,
  AIRWAY_DEPARTMENTS_ROUTE,
  AIRWAY_EMPLOYEES_ROUTE,
  AIRWAY_EMPLOYEE_IMPORT_ROUTE,

  AIRWAY_ASSETS_ROUTE,
  AIRWAY_ASSETS_LAPTOPS_ROUTE,
  AIRWAY_ASSETS_MONITORS_ROUTE,
  AIRWAY_ASSETS_OFFICE_ELECTRONIC_ROUTE,
  AIRWAY_ASSETS_OFFICE_NONELECTRONIC_ROUTE,
  AIRWAY_ASSETS_MACHINES_ROUTE,
  AIRWAY_ASSETS_INTAKE_ROUTE,
  AIRWAY_ASSETS_NEW_ROUTE,
  AIRWAY_ASSETS_DETAIL_ROUTE,
  LEGACY_ASSETS_M365_ROUTE,

  AIRWAY_ACCOUNTS_ROUTE,
  AIRWAY_ACCOUNTS_GWS_ROUTE,
  AIRWAY_ACCOUNTS_AWS_ROUTE,
  AIRWAY_ACCOUNTS_M365_ROUTE,
  AIRWAY_ACCOUNTS_NEW_ROUTE,
  AIRWAY_ACCOUNTS_DETAIL_ROUTE,

  AIRWAY_FORMS_ROUTE,
  AIRWAY_FORMS_APPLY_INDEX_ROUTE,
  AIRWAY_FORMS_APPLY_ROUTE,
  AIRWAY_FORMS_CENTER_ROUTE,
  AIRWAY_FORMS_DETAIL_ROUTE,
  AIRWAY_FORMS_DESIGNER_ROUTE,
  AIRWAY_FORMS_DESIGNER_EDIT_ROUTE,
  AIRWAY_FORMS_DATA_ROUTE,
  AIRWAY_FORMS_PERMISSIONS_ROUTE,
  AIRWAY_PERMISSIONS_ROUTE,
  AIRWAY_AD_PERMISSIONS_ROUTE,
  AIRWAY_PROFILE_ROUTE,
  AIRWAY_TEST_ROUTE,

  LEGACY_FORMS_HR_ROUTE,
  LEGACY_FORMS_IT_ROUTE,
  LEGACY_FORMS_GA_ROUTE,
  LEGACY_APPROVAL_APPLY_ROUTE,
  LEGACY_APPROVAL_CENTER_ROUTE,
  LEGACY_APPROVAL_TEMPLATES_ROUTE,
  LEGACY_AIRWAY_PORTAL_ROUTE,
  LEGACY_AIRWAY_DASHBOARD_ROUTE,
  LEGACY_AIRWAY_DEPARTMENTS_ROUTE,
  LEGACY_AIRWAY_EMPLOYEES_ROUTE,
  LEGACY_AIRWAY_EMPLOYEE_IMPORT_ROUTE,
  LEGACY_AIRWAY_TEST_ROUTE,
  NOT_FOUND_ROUTE
];

export function createBuiltinVueRoutes() {
  return transformElegantRoutesToVueRoutes(builtinRoutes, layouts, views);
}
