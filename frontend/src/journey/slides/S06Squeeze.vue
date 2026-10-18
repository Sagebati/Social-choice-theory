<script setup lang="ts">
import { computed, ref } from 'vue'
import Challenge from '../../components/Challenge.vue'
import SpatialMap from '../../components/SpatialMap.vue'
import Takeaway from '../../components/Takeaway.vue'
import WinnerStrip from '../../components/WinnerStrip.vue'
import { favourites, model, resultFor, useSpatial, useYee } from '../../composables/useApi'
import type { Crowd, MethodId, SpatialCandidate } from '../../types'
import SlideFrame from '../SlideFrame.vue'

const candidates = ref<SpatialCandidate[]>([
  { name: 'Ada', x: 0.18, y: 0.5 },
  { name: 'Bea', x: 0.5, y: 0.5 },
  { name: 'Cal', x: 0.82, y: 0.5 },
])
const crowds = ref<Crowd[]>([
  { x: 0.2, y: 0.5, spread: 0.13, count: 36 },
  { x: 0.8, y: 0.5, spread: 0.13, count: 34 },
  { x: 0.47, y: 0.5, spread: 0.12, count: 30 },
])
const names = computed(() => candidates.value.map((c) => c.name))
const current = computed(() => model({ candidates: candidates.value, crowds: crowds.value }))
const { data } = useSpatial(() => current.value, ['plurality', 'irv'])
const irv = computed(() => resultFor(data.value, 'irv'))
const outcomes = computed(() => data.value?.results.map((r) => r.outcome) ?? [])
const pairwise = computed(() => data.value?.pairwise ?? null)

const showYee = ref(false)
const yeeMethod = ref<MethodId>('irv')
const { data: yee } = useYee(() => (showYee.value ? current.value : null), () => yeeMethod.value)

const duel = (a: number, b: number) => {
  const m = pairwise.value?.matrix
  return m ? `${m[a][b]}–${m[b][a]}` : '…'
}
</script>

<template>
  <SlideFrame title="Squeezed out">
    <template #story>
      <p>
        Bea stands in the middle. Almost everyone ranks Bea first or second, and head to head Bea beats Ada
        <strong>{{ duel(1, 0) }}</strong> and Cal <strong>{{ duel(1, 2) }}</strong>.
      </p>
      <p>
        But Bea has the fewest <em>first</em> choices. Instant runoff knocks Bea out in round one, and the
        candidate most voters would have accepted is gone. This is the <strong>centre squeeze</strong>.
      </p>
      <Challenge id="s6" :done="irv?.outcome.winner === 1 && !irv.outcome.used_tiebreak">
        Drag the crowds or the candidates until Bea survives and wins the instant runoff.
      </Challenge>
      <label class="row small">
        <input v-model="showYee" type="checkbox" />
        <span>Colour the map by who would win if the crowd stood there (a <strong>Yee diagram</strong>)</span>
      </label>
      <div v-if="showYee" class="row small" role="radiogroup" aria-label="Method for the Yee diagram">
        <button class="btn small" :class="{ primary: yeeMethod === 'irv' }" @click="yeeMethod = 'irv'">Instant runoff</button>
        <button class="btn small" :class="{ primary: yeeMethod === 'plurality' }" @click="yeeMethod = 'plurality'">Plurality</button>
        <button class="btn small" :class="{ primary: yeeMethod === 'schulze' }" @click="yeeMethod = 'schulze'">Head to head</button>
      </div>
      <p v-if="showYee" class="small muted">
        Each square shows who would win if a crowd of voters were centred there. Under instant runoff Bea's
        territory shrinks to a sliver, even though Bea is the head-to-head winner across a wide band.
      </p>
      <Takeaway after="s6">
        <p>
          This really happens. In Burlington, Vermont's 2009 mayoral race, and Alaska's 2022 special House
          election, the candidate who would have won every head-to-head contest was eliminated by instant runoff.
          Burlington repealed IRV the next year.
        </p>
      </Takeaway>
    </template>
    <template #stage>
      <SpatialMap
        v-model:candidates="candidates"
        v-model:crowds="crowds"
        :points="data?.voters ?? []"
        :colors="favourites(data, 'irv')"
        :winner="irv?.outcome.winner"
        :yee="showYee ? yee : null"
      />
      <WinnerStrip :outcomes="outcomes" :names="names" :condorcet="pairwise?.condorcet_winner" show-condorcet />
    </template>
  </SlideFrame>
</template>
