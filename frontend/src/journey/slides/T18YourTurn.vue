<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import RichText from '../../components/RichText'
import TownFrame from '../TownFrame.vue'

// Rows of the cheat sheet, `t18.rows.<id>`.
const SHEET = ['plurality', 'two_round', 'irv', 'borda', 'condorcet', 'approval', 'score'] as const
const { t } = useI18n()
</script>

<template>
  <TownFrame :title="t('journey.steps.yourTurn')">
    <template #story>
      <p>{{ t('t18.intro') }}</p>
      <ul>
        <RichText tag="li" :text="t('t18.arrow')" />
        <RichText tag="li" :text="t('t18.gibbard')" />
      </ul>
      <p>{{ t('t18.outro') }}</p>
      <div class="row">
        <RouterLink class="btn primary" to="/sandbox">{{ t('t18.sandbox') }}</RouterLink>
        <RouterLink class="btn" to="/rigging">{{ t('t18.rigging') }}</RouterLink>
        <RouterLink class="btn" to="/lab">{{ t('t18.lab') }}</RouterLink>
      </div>
    </template>
    <template #panel>
      <div class="card">
        <div class="eyebrow">{{ t('t18.sheet') }}</div>
        <table class="sheet">
          <thead>
            <tr>
              <th scope="col">{{ t('t18.system') }}</th>
              <th scope="col">{{ t('t18.weak') }}</th>
              <th scope="col">{{ t('t18.rig') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in SHEET" :key="row">
              <th scope="row">{{ t(`t18.rows.${row}.system`) }}</th>
              <td>{{ t(`t18.rows.${row}.weak`) }}</td>
              <td>{{ t(`t18.rows.${row}.rig`) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </TownFrame>
</template>

<style scoped>
.sheet {
  width: 100%;
  font-size: 0.88rem;
}

.sheet th,
.sheet td {
  text-align: left;
  padding: 0.4rem 0.45rem;
  border-bottom: 1px solid var(--grid);
  vertical-align: top;
}

.sheet thead th {
  font-size: 0.75rem;
  color: var(--ink-2);
}

a.btn {
  text-decoration: none;
}
</style>
