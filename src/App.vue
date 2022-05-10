<script setup>
    // This starter template is using Vue 3 <script setup> SFCs
    // Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
    import {ref} from 'vue'

    import LazyLoadList from './components/lazy-load-list.vue'
    import {getRandomContent} from './utils/index'

    const fixedData = ref([]);
    const variableData = ref([]);
    const initData = () => {
        for (let i = 0; i < 10000; i++) {
            fixedData.value.push({
                id: `fixed_${i}`,
                content: getRandomContent(100)
            });

            variableData.value.push({
                id: `variable_${i}`,
                content: getRandomContent(Math.floor(Math.random() * 200))
            })
        }
    };

    initData();

    // setTimeout(() => {
    //     fixedData.value = fixedData.value.slice(300);
    //     variableData.value = variableData.value.slice(300);
    // }, 5000)
</script>

<template>
    <div class="main">
        <section>
            <div>
                <h3>定行高</h3>
                <LazyLoadList :data="fixedData" :remain="10" :lineHeight="120" dataKey="id" class="lazy-load-wrap">
                    <template v-slot="{item}">
                        <div style="border-bottom: 1px solid deepskyblue; height: 110px; padding-bottom: 10px;">
                            <header> No. {{item._index + 1}}</header>
                            <span>{{item.content}}</span>
                        </div>
                    </template>
                </LazyLoadList>
            </div>
        </section>

        <section>
            <div>
                <h3>变行高</h3>
                <LazyLoadList type="variable" :data="variableData" dataKey="id" class="lazy-load-wrap">
                    <template v-slot="{item}">
                        <div style="border-bottom: 1px solid deepskyblue; padding-bottom: 10px;">
                            <header> No. {{item._index + 1}}</header>
                            <span>{{item.content}}</span>
                        </div>
                    </template>
                </LazyLoadList>
            </div>
        </section>
    </div>
</template>

<style>
    .main {
        display: flex;
    }

    section {
        margin: 0 20px;
        flex: 1;
        display: flex;
        justify-content: center;
    }

    .lazy-load-wrap {
        width: 450px;
        height: 600px;
    }
</style>
