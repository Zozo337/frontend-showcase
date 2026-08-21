<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { AuthSettings } from "../api/auth";
import { fetchAuthSettings, saveAuthSettings } from "../api/auth";

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const message = ref("");

const settings = reactive<AuthSettings>({
  auth_required: true,
  auth_mode: "ad",
  local_enabled: false,
  ad_enabled: true,
  google_enabled: false,
  google_allowed_domain: "",
  ad_url: "",
  ad_base_dn: "",
  ad_domain: "",
  ad_user_suffix: "",
  ad_admin_groups: [],
  admin_emails: [],
  admin_users: [],
});

const adAdminGroupsText = ref("");
const adminEmailsText = ref("");
const adminUsersText = ref("");

function apply(data: AuthSettings) {
  Object.assign(settings, data);
  adAdminGroupsText.value = (data.ad_admin_groups || []).join(", ");
  adminEmailsText.value = (data.admin_emails || []).join(", ");
  adminUsersText.value = (data.admin_users || []).join(", ");
}

function splitCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    apply(await fetchAuthSettings());
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = "";
  message.value = "";
  try {
    const saved = await saveAuthSettings({
      ...settings,
      ad_admin_groups: splitCsv(adAdminGroupsText.value),
      admin_emails: splitCsv(adminEmailsText.value),
      admin_users: splitCsv(adminUsersText.value),
    });
    apply(saved);
    message.value = "Authentication settings saved.";
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>Settings</h2>
        <p>Authentication provider control for the intranet deployment.</p>
      </div>
      <button type="button" @click="load">Refresh</button>
    </header>

    <div v-if="loading" class="state">Loading settings...</div>
    <div v-else class="detail-panel settings-grid">
      <label class="field inline-field">
        <input v-model="settings.auth_required" type="checkbox" />
        <span>Require login</span>
      </label>

      <label class="field">
        <span>Login mode label</span>
        <select v-model="settings.auth_mode">
          <option value="ad">AD only</option>
          <option value="local_ad">Local + AD</option>
          <option value="local">Local only</option>
          <option value="google">Google only</option>
          <option value="local_google">Local + Google</option>
          <option value="all">All providers</option>
          <option value="none">No login required</option>
        </select>
      </label>

      <div class="settings-columns">
        <section class="detail-panel nested-panel">
          <h3>Providers</h3>
          <label class="field inline-field">
            <input v-model="settings.ad_enabled" type="checkbox" />
            <span>Enable AD login</span>
          </label>
          <label class="field inline-field">
            <input v-model="settings.local_enabled" type="checkbox" />
            <span>Enable local admin login</span>
          </label>
          <label class="field inline-field">
            <input v-model="settings.google_enabled" type="checkbox" />
            <span>Enable Google login</span>
          </label>
          <p class="muted">Google is hidden unless this switch is enabled.</p>
        </section>

        <section class="detail-panel nested-panel">
          <h3>AD / LDAP</h3>
          <label class="field">
            <span>AD URL</span>
            <input v-model="settings.ad_url" placeholder="ldap://ad.example.internal:389" />
          </label>
          <label class="field">
            <span>Base DN</span>
            <input v-model="settings.ad_base_dn" placeholder="DC=example,DC=local" />
          </label>
          <label class="field">
            <span>Domain</span>
            <input v-model="settings.ad_domain" placeholder="EXAMPLE or example.internal" />
          </label>
          <label class="field">
            <span>User suffix</span>
            <input v-model="settings.ad_user_suffix" placeholder="@example.internal" />
          </label>
          <label class="field">
            <span>AD admin groups</span>
            <input v-model="adAdminGroupsText" placeholder="Domain Admins, IT" />
          </label>
        </section>
      </div>

      <section class="detail-panel nested-panel">
        <h3>Administrators</h3>
        <label class="field">
          <span>Admin emails</span>
          <input v-model="adminEmailsText" placeholder="admin@example.com" />
        </label>
        <label class="field">
          <span>Admin usernames</span>
          <input v-model="adminUsersText" placeholder="administrator, demo-admin" />
        </label>
      </section>

      <section class="detail-panel nested-panel">
        <h3>Google</h3>
        <label class="field">
          <span>Allowed Workspace domain</span>
          <input v-model="settings.google_allowed_domain" placeholder="example.com" />
        </label>
      </section>

      <div class="command-row compact">
        <button type="button" :disabled="saving" @click="save">
          {{ saving ? 'Saving...' : 'Save settings' }}
        </button>
      </div>
      <p v-if="message" class="state success">{{ message }}</p>
      <p v-if="error" class="state error">{{ error }}</p>
    </div>
  </section>
</template>
