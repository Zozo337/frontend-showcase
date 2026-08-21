<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMessage } from 'naive-ui';

defineOptions({ name: 'AirwayApiDocs' });

const message = useMessage();

const keyword = ref('');
const baseUrl = ref('https://oa.example.com');

const authNote = `此公開展示只使用瀏覽器 Mock API，不會建立或共用正式 Session、Token 或 API Key。`;

const apiGroups = [
  {
    title: '系統狀態',
    description: '用來確認後端服務、資料庫與 runtime 是否正常。',
    apis: [
      {
        method: 'GET',
        path: '/api/health',
        auth: '不需登入',
        title: '健康檢查',
        description: '確認後端服務是否正常、目前 DB driver 與 runtime 狀態。',
        response: {
          ok: true,
          service: 'hr-it-admin',
          dbDriver: 'postgres',
          postgresRuntime: true
        }
      }
    ]
  },
  {
    title: '登入與目前使用者',
    description: '查詢目前登入者、權限與登出。',
    apis: [
      {
        method: 'GET',
        path: '/api/auth/me',
        auth: '需要登入',
        title: '取得目前登入者',
        description: '取得目前登入者資料、角色與頁面權限。左側選單與路由權限會依此判斷。',
        response: {
          ok: true,
          user: {
            id: 44,
            name: 'Demo.User',
            email: 'demo.user@example.com',
            permissions: ['*']
          }
        }
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        auth: '需要登入',
        title: '登出',
        description: '清除 Session Cookie 並登出系統。',
        body: {}
      }
    ]
  },
  {
    title: '人員與組織',
    description: '提供資產、帳號、權限頁面使用的人員與部門資料。',
    apis: [
      {
        method: 'GET',
        path: '/api/employees',
        auth: '需要登入',
        title: '查詢員工清單',
        description: '取得員工主檔。可用於人員管理頁、權限角色、人員下拉選單。',
        query: {
          q: '姓名 / Email / 工號',
          limit: 1000,
          includeInactive: true
        }
      },
      {
        method: 'GET',
        path: '/api/employees/lookup',
        auth: '需要登入',
        title: '員工下拉查詢',
        description: '給前端下拉選單使用，通常會回傳精簡員工資料。',
        query: {
          limit: 1000,
          includeInactive: true,
          includeDeleted: true
        }
      },
      {
        method: 'GET',
        path: '/api/departments',
        auth: '需要登入',
        title: '查詢部門清單',
        description: '取得組織架構、部門代碼、部門名稱與父子層級。'
      }
    ]
  },
  {
    title: '資產管理',
    description: '實體固定資產。現在是 DB only，不打外部 API。公司購入會產生固定 QR URL，非公司購入不產 QR。',
    apis: [
      {
        method: 'GET',
        path: '/api/assets',
        auth: '需要登入',
        title: '查詢資產清單',
        description: '依分類、狀態、關鍵字查詢資產。',
        query: {
          category: 'laptop | monitor | office_equipment_electronic | office_equipment_nonelectronic | machine_equipment',
          status: 'in_stock | pending_assign | assigned | returned | repair | retired',
          q: '資產編號 / 名稱 / 型號 / 序號 / 保管人',
          includeReturned: true,
          includeRetired: true
        }
      },
      {
        method: 'POST',
        path: '/api/assets',
        auth: '需要登入',
        title: '新增資產',
        description: '新增資產資料。資產編號必填。公司購入時前端會送固定 QR URL；非公司購入 qr_text 可為 null。',
        body: {
          asset_no: 'SC-TPE-NB-032',
          asset_category: 'laptop',
          asset_type: 'laptop',
          name: '筆記型電腦',
          brand: 'ASUS',
          model: 'ASUS A18 FA808UM',
          serial_no: 'TBNXCX005984455',
          status: 'assigned',
          employee_id: 44,
          location: '研發處',
          purchase_source: 'company',
          qr_text: 'https://oa.example.com/airway/assets/detail/SC-TPE-NB-032',
          qr_url: 'https://oa.example.com/airway/assets/detail/SC-TPE-NB-032',
          extra_json: {
            source_sheet: '1.辦公室資訊設備',
            qr_generated: true
          }
        }
      },
      {
        method: 'GET',
        path: '/api/assets/code/:assetNo',
        auth: '需要登入',
        title: '用資產編號查詳情',
        description: 'QR Code 掃描後的詳情頁會用這支查詢。',
        examplePath: '/api/assets/code/SC-TPE-NB-032'
      },
      {
        method: 'GET',
        path: '/api/assets/:id',
        auth: '需要登入',
        title: '用 ID 查資產',
        description: '取得單筆資產詳細資料。'
      },
      {
        method: 'PUT',
        path: '/api/assets/:id',
        auth: '需要登入',
        title: '更新資產',
        description: '更新資產資料。QR 建議保持固定 URL，不要放保管人、位置、狀態等會變動欄位。',
        body: {
          location: '內湖辦公室',
          status: 'assigned',
          employee_id: 44,
          note: '盤點確認'
        }
      },
      {
        method: 'DELETE',
        path: '/api/assets/:id',
        auth: '需要登入',
        title: '資產報廢',
        description: '目前為 soft delete / 標記 retired，不直接刪除資料。'
      }
    ]
  },
  {
    title: '帳號管理',
    description: 'GWS / AWS / M365 帳號。帳號管理可以接外部 API / webhook，用於日後自動建帳、停用、刪除。',
    apis: [
      {
        method: 'GET',
        path: '/api/accounts',
        auth: '需要登入',
        title: '查詢帳號清單',
        description: '查詢 GWS、AWS、M365 帳號資料。',
        query: {
          system: 'gws | aws | m365',
          status: 'pending_create | active | pending_disable | disabled | pending_delete | deleted | api_failed',
          q: '帳號 / Email / 員工 / 角色',
          includeDeleted: true
        }
      },
      {
        method: 'POST',
        path: '/api/accounts',
        auth: '需要登入',
        title: '新增帳號',
        description: '建立帳號紀錄，並可觸發後端帳號 webhook。適合日後接 GWS / AWS / M365 自動化。',
        body: {
          system_name: 'gws',
          employee_id: 44,
          account_name: 'user@example.com',
          account_email: 'user@example.com',
          account_status: 'pending_create',
          role: 'User',
          permission_group: 'HR',
          license_name: 'Business Standard',
          need_2fa: true,
          note: '新人建帳'
        }
      },
      {
        method: 'GET',
        path: '/api/accounts/:id',
        auth: '需要登入',
        title: '查詢帳號詳情',
        description: '取得單筆帳號資料、員工資料與同步狀態。'
      },
      {
        method: 'PUT',
        path: '/api/accounts/:id',
        auth: '需要登入',
        title: '更新帳號',
        description: '更新帳號狀態、角色、授權、MFA、備註等欄位。',
        body: {
          account_status: 'active',
          role: 'Admin',
          need_2fa: true
        }
      },
      {
        method: 'DELETE',
        path: '/api/accounts/:id',
        auth: '需要登入',
        title: '封存帳號',
        description: '將帳號標記為 deleted，保留歷史紀錄。'
      },
      {
        method: 'POST',
        path: '/api/accounts/:id/sync',
        auth: '需要登入',
        title: '觸發帳號同步',
        description: '由 OA 後端觸發 GWS / AWS / M365 webhook。資產管理目前不需要這種 API，帳號管理才需要。',
        body: {
          action: 'account.manual_sync'
        }
      }
    ]
  },
  {
    title: '權限控管',
    description: '目前使用 Role ACL：超級管理員全開；一般使用者透過自訂角色取得頁面權限。',
    apis: [
      {
        method: 'GET',
        path: '/api/simple-permissions/config',
        auth: '需要超級管理員',
        title: '讀取角色權限設定',
        description: '取得可勾選頁面、角色清單、超級管理員名單。'
      },
      {
        method: 'POST',
        path: '/api/simple-permissions/roles',
        auth: '需要超級管理員',
        title: '新建角色',
        description: '建立自訂角色，可勾頁面、選人，或設定為預設全員角色。',
        body: {
          name: 'HR',
          description: '人資可用頁面',
          page_keys: ['portal', 'dashboard', 'profile', 'forms', 'forms_center', 'employees'],
          employee_ids: [44, 79],
          is_default_all: false
        }
      },
      {
        method: 'PUT',
        path: '/api/simple-permissions/roles/:id',
        auth: '需要超級管理員',
        title: '更新角色',
        description: '更新角色名稱、說明、可看頁面、套用人員、是否預設全員。'
      },
      {
        method: 'DELETE',
        path: '/api/simple-permissions/roles/:id',
        auth: '需要超級管理員',
        title: '停用角色',
        description: 'soft delete，將角色 is_active 設為 0。'
      },
      {
        method: 'PUT',
        path: '/api/simple-permissions/super-admins',
        auth: '需要超級管理員',
        title: '更新超級管理員',
        description: '設定誰是 Super Admin。至少要保留一位。',
        body: {
          employee_ids: [44, 79]
        }
      },
      {
        method: 'GET',
        path: '/api/simple-permissions/me',
        auth: '需要登入',
        title: '取得自己的頁面權限',
        description: '取得目前登入者可看的 page_keys 與 permissions。'
      }
    ]
  },
  {
    title: '匯入暫存',
    description: '目前只開預覽 / staging，不直接正式寫入，避免行政交接 Google Sheet 欄位不一致污染正式資料。',
    apis: [
      {
        method: 'POST',
        path: '/api/assets/import/preview',
        auth: '需要登入',
        title: '資產匯入預覽',
        description: '先把匯入資料放入 staging，確認 mapping 後才會開正式 confirm。',
        body: {
          source_name: '固定資產盤點表.xlsx',
          rows: [
            {
              asset_no: 'SC-TPE-NB-032',
              brand: 'ASUS',
              model: 'ASUS A18 FA808UM'
            }
          ]
        }
      },
      {
        method: 'POST',
        path: '/api/assets/import/confirm',
        auth: '需要登入',
        title: '資產匯入確認',
        description: '目前保留 API 位置，等 Google Sheet 欄位 mapping 完成後再開啟正式寫入。'
      },
      {
        method: 'POST',
        path: '/api/accounts/import/preview',
        auth: '需要登入',
        title: '帳號匯入預覽',
        description: '帳號資料先進 staging，不直接正式寫入。'
      },
      {
        method: 'POST',
        path: '/api/accounts/import/confirm',
        auth: '需要登入',
        title: '帳號匯入確認',
        description: '目前保留 API 位置。'
      }
    ]
  }
];

const methodTypeMap: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  DELETE: 'error'
};

const filteredGroups = computed(() => {
  const q = keyword.value.trim().toLowerCase();

  if (!q) return apiGroups;

  return apiGroups
    .map(group => ({
      ...group,
      apis: group.apis.filter(api => {
        const blob = [
          group.title,
          group.description,
          api.method,
          api.path,
          api.title,
          api.description,
          api.auth
        ].join(' ').toLowerCase();

        return blob.includes(q);
      })
    }))
    .filter(group => group.apis.length > 0);
});

function fullUrl(api: any) {
  return `${baseUrl.value}${api.examplePath || api.path}`;
}

function stringify(value: any) {
  if (!value) return '';

  return JSON.stringify(value, null, 2);
}

function curlOf(api: any) {
  const url = fullUrl(api);

  const lines = [
    `curl -k -X ${api.method} '${url}'`,
    `  -H 'Accept: application/json'`
  ];

  if (api.method !== 'GET') {
    lines.push(`  -H 'Content-Type: application/json'`);

    if (api.body) {
      lines.push(`  -d '${JSON.stringify(api.body, null, 2)}'`);
    }
  }

  return lines.join(' \\\n');
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
  message.success('已複製');
}
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false" class="hero">
      <div class="hero-row">
        <div>
          <div class="eyebrow">Demo OA / API Documentation</div>
          <h2>Demo OA API 說明書</h2>
          <p>
            這頁整理目前 OA 可以呼叫的 API、用途、權限需求與範例 Payload。資產管理目前是 DB only；帳號管理保留外部系統同步能力。
          </p>
        </div>

        <NSpace>
          <NButton @click="copyText(baseUrl)">複製 Base URL</NButton>
        </NSpace>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <span>Base URL</span>
          <strong>{{ baseUrl }}</strong>
        </div>
        <div class="summary-card">
          <span>認證方式</span>
          <strong>Session Cookie</strong>
        </div>
        <div class="summary-card">
          <span>回應格式</span>
          <strong>{ ok, data }</strong>
        </div>
        <div class="summary-card warning">
          <span>外部系統</span>
          <strong>建議補 API Key</strong>
        </div>
      </div>
    </NCard>

    <NAlert type="warning" :bordered="false">
      {{ authNote }}
    </NAlert>

    <NCard>
      <div class="toolbar">
        <NInput
          v-model:value="keyword"
          clearable
          placeholder="搜尋 API、路徑、用途、模組"
          class="search"
        />
      </div>
    </NCard>

    <template v-for="group in filteredGroups" :key="group.title">
      <NCard :title="group.title">
        <template #header-extra>
          <NTag :bordered="false" type="info">{{ group.apis.length }} APIs</NTag>
        </template>

        <p class="group-desc">{{ group.description }}</p>

        <NSpace vertical :size="12">
          <NCollapse accordion>
            <NCollapseItem
              v-for="api in group.apis"
              :key="`${api.method}-${api.path}`"
              :name="`${api.method}-${api.path}`"
            >
              <template #header>
                <div class="api-header">
                  <NTag :type="methodTypeMap[api.method] || 'default'" :bordered="false">
                    {{ api.method }}
                  </NTag>
                  <code>{{ api.path }}</code>
                  <strong>{{ api.title }}</strong>
                </div>
              </template>

              <NSpace vertical :size="12">
                <NDescriptions bordered :column="2">
                  <NDescriptionsItem label="用途" :span="2">
                    {{ api.description }}
                  </NDescriptionsItem>
                  <NDescriptionsItem label="權限">
                    <NTag :type="api.auth.includes('不需') ? 'success' : api.auth.includes('超級') ? 'error' : 'warning'" :bordered="false">
                      {{ api.auth }}
                    </NTag>
                  </NDescriptionsItem>
                  <NDescriptionsItem label="完整 URL">
                    <code>{{ fullUrl(api) }}</code>
                  </NDescriptionsItem>
                </NDescriptions>

                <template v-if="api.query">
                  <h4>Query Params</h4>
                  <pre>{{ stringify(api.query) }}</pre>
                </template>

                <template v-if="api.body">
                  <h4>Request Body</h4>
                  <pre>{{ stringify(api.body) }}</pre>
                </template>

                <template v-if="api.response">
                  <h4>Response Example</h4>
                  <pre>{{ stringify(api.response) }}</pre>
                </template>

                <h4>cURL Example</h4>
                <pre>{{ curlOf(api) }}</pre>

                <NSpace justify="end">
                  <NButton size="small" @click="copyText(fullUrl(api))">複製 URL</NButton>
                  <NButton size="small" type="primary" ghost @click="copyText(curlOf(api))">複製 cURL</NButton>
                </NSpace>
              </NSpace>
            </NCollapseItem>
          </NCollapse>
        </NSpace>
      </NCard>
    </template>
  </NSpace>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(circle at top right, rgba(24, 160, 251, 0.14), transparent 34%),
    linear-gradient(135deg, #ffffff, #f7faff);
}

.hero-row,
.toolbar,
.api-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-row,
.toolbar {
  justify-content: space-between;
}

.eyebrow {
  margin-bottom: 6px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}

h4 {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 800;
}

p {
  max-width: 920px;
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.7;
}

.group-desc {
  margin-bottom: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.summary-card {
  padding: 14px 16px;
  border: 1px solid #edf0f5;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
}

.summary-card span {
  display: block;
  color: #8a94a6;
  font-size: 12px;
}

.summary-card strong {
  display: block;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 800;
  word-break: break-all;
}

.summary-card.warning strong {
  color: #d97706;
}

.search {
  width: 420px;
}

.api-header code {
  padding: 2px 8px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #111827;
  font-size: 13px;
}

pre {
  max-height: 360px;
  overflow: auto;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 960px) {
  .hero-row,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .search {
    width: 100%;
  }

  .api-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
