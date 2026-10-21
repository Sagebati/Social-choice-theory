<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { color } from '../palette'

// The key to an opinion map, whose voters and Yee cells are told apart only by
// colour: what the colours mean, and each candidate's share of both in words.
const props = withDefaults(
  defineProps<{
    names: string[]
    /** Candidate index each voter dot is coloured with (null: grey). */
    colors: (number | null)[]
    rings?: boolean[]
    yee?: { cells: number[] } | null
    /** The method the map is coloured by. */
    method: string
    /** Dots follow ballots from round to round. */
    byRound?: boolean
  }>(),
  { rings: () => [], yee: null, byRound: false },
)
const { t, n } = useI18n()
const pct = (share: number) => n(share, { style: 'percent' })

const share = (list: (number | null)[], c: number | null) => (list.length ? list.filter((x) => x === c).length / list.length : 0)

const rows = computed(() =>
  props.names.map((name, i) => ({
    i,
    name,
    voters: pct(share(props.colors, i)),
    map: props.yee ? pct(share(props.yee.cells, i)) : null,
  })),
)
const exhausted = computed(() => share(props.colors, null))
</script>

<template>
  <div class="legend small" role="group" :aria-label="t('mapLegend.aria')">
    <p class="muted">
      {{ byRound ? t('mapLegend.dotsRound') : t('mapLegend.dots') }}
      <template v-if="rings.some(Boolean)">{{ t('mapLegend.rings') }}</template>
      <template v-if="yee">{{ t('mapLegend.yee', { method }) }}</template>
    </p>
    <ul>
      <li v-for="row in rows" :key="row.i">
        <span class="sw" :style="{ background: color(row.i) }" aria-hidden="true" />
        <strong>{{ row.name }}</strong>
        <span>{{ t('mapLegend.voters', { share: row.voters }) }}<template v-if="row.map">, {{ t('mapLegend.map', { share: row.map }) }}</template></span>
      </li>
      <li v-if="exhausted > 0">
        <span class="sw none" aria-hidden="true" />
        <strong>{{ t('mapLegend.none') }}</strong>
        <span>{{ t('mapLegend.voters', { share: pct(exhausted) }) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.legend p {
  margin: 0 0 0.35rem;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.9rem;
}

li {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
}

.sw {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}

.sw.none {
  background: var(--muted);
}

span {
  color: var(--ink-2);
}
</style>
