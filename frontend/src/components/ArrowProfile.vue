<script setup lang="ts">
import { color } from '../palette'
import type { ArrowProfile } from '../types'

// One profile from the Arrow check: each voter's ranking and society's.
defineProps<{ profile: ArrowProfile; names: string[]; changed?: number[]; caption?: string }>()
</script>

<template>
  <figure class="profile">
    <figcaption v-if="caption" class="eyebrow">{{ caption }}</figcaption>
    <table>
      <thead>
        <tr>
          <th v-for="(_, v) in profile.ballots" :key="v" :class="{ changed: changed?.includes(v) }" scope="col">
            {{ $t('arrowProfile.voter', { n: v + 1 }) }}
          </th>
          <th class="society" scope="col">{{ $t('arrowProfile.society') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pos in names.length" :key="pos">
          <td v-for="(ballot, v) in profile.ballots" :key="v" :class="{ changed: changed?.includes(v) }">
            <span class="sw" :style="{ background: color(ballot[pos - 1]) }" />{{ names[ballot[pos - 1]] }}
          </td>
          <td v-if="pos === 1" class="society" :rowspan="names.length">
            <template v-if="profile.social">
              <div v-for="(tier, t) in profile.social" :key="t" class="tier">
                <span v-for="(c, k) in tier" :key="c">
                  <span v-if="k > 0" class="eq"> = </span>
                  <span class="sw" :style="{ background: color(c) }" />{{ names[c] }}
                </span>
              </div>
            </template>
            <span v-else class="cycle">{{ $t('arrowProfile.noRanking') }}<br />{{ $t('arrowProfile.cycle') }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>

<style scoped>
.profile {
  margin: 0;
}

table {
  font-size: 0.85rem;
}

th,
td {
  padding: 0.2rem 0.5rem;
  text-align: left;
  white-space: nowrap;
}

th {
  font-size: 0.75rem;
  color: var(--ink-2);
  font-weight: 600;
}

.changed {
  background: var(--warn-bg);
}

.society {
  border-left: 2px solid var(--ink);
  font-weight: 700;
  vertical-align: top;
}

.tier {
  padding: 0.1rem 0;
}

.eq {
  color: var(--muted);
}

.cycle {
  color: var(--bad);
}

.sw {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.3em;
}
</style>
