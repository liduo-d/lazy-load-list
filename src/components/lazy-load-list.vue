<script setup>
    import {ref, computed, watch, onMounted, onUpdated, nextTick} from 'vue'

    const props = defineProps({
        // fixed variable
        type: {
            type: String,
            default: 'fixed',
        },
        data: {
            type: Array,
            required: true,
            default: () => [],
        },
        dataKey: {
            type: String,
            required: true,
        },
        // 每屏可见条数（fixed必须）
        remain: {
            type: Number,
            // required: false,
        },
        // 单条行高（fixed必须）
        lineHeight: {
            type: Number,
            // required: false,
        },
        // 视口前渲染几屏
        previousScreen: {
            type: Number,
            required: false,
            default: 1,
        },
        // 视口后渲染几屏
        nextScreen: {
            type: Number,
            required: false,
            default: 1,
        },
        // 变行高视口高度（fixed会被忽略）
        variableHeight: {
            type: [String, Number],
            // required: false,
            default: '100%',
        }
    });
    const emit = defineEmits(['load']);

    // 变行高 默认可见条数
    const DEFAULT_REMAIN = 10;
    // 变行高 默认初始行高
    const DEFAULT_LINE_HEIGHT = 50;

    /**
     * 是否是变行高
     * @type {ComputedRef<boolean>}
     */
    const isVariable = computed(() => props.type.toLowerCase() === 'variable');

    const start = ref(0);
    const end = ref(0);

    // 渲染区域偏移量
    const offset = ref(0);
    // 视口偏移量
    const scrollTop = ref(0);

    const lazyLoadRef = ref(null);
    const scrollBarRef = ref(null);
    const renderNodeRef = ref(null);

    const previousCount = computed(() => Math.min(start.value, (props.remain || DEFAULT_REMAIN) * props.previousScreen));
    const nextCount = computed(() => Math.min(props.data.length - end.value, (props.remain || DEFAULT_REMAIN) * props.nextScreen));

    const formatData = computed(() => props.data.map((item, _index) => ({...item, _index})));
    const renderData = computed(() => formatData.value.slice(start.value - previousCount.value, end.value + nextCount.value));

    const variableData = ref([]);

    watch(() => props.data, newVal => {
        if (isVariable.value) {
            const previousLength = variableData.value.length;
            const currentLength = newVal.length;
            if (currentLength >= previousLength) {
                variableData.value = [...variableData.value, ...addCoordinate(newVal.slice(previousLength))];
            } else {
                variableData.value = variableData.value.slice(0, currentLength);
            }
        } else {
            scrollBarRef.value.style.height = newVal.length * props.lineHeight + 'px';
        }

        nextTick(() => {
            emitLoad();
        })
    });

    const addCoordinate = data => {
        if (data.length === 0) return [];
        const previousLength = variableData.value.length;
        return data.map((item, idx) => ({
            _index: previousLength + idx,
            // 默认行高填充单条高度，之后在onUpdate中获取DOM后更新准确高度
            top: (previousLength + idx) * (props.lineHeight || DEFAULT_LINE_HEIGHT),
            bottom: (previousLength + idx + 1) * (props.lineHeight || DEFAULT_LINE_HEIGHT),
            height: props.lineHeight || DEFAULT_LINE_HEIGHT
        }))
    };

    onMounted(() => {
        if (!isVariable.value && (!props.remain || !props.lineHeight)) {
            throw new Error(`定行高时，单屏条数和单条行高为必传字段`);
        }
        if (isVariable.value && !props.variableHeight) {
            throw new Error(`变行高时，视口高度为必传字段`);
        }

        scrollBarRef.value.style.height = props.data.length * (props.lineHeight || DEFAULT_LINE_HEIGHT) + 'px';
        end.value = start.value + props.remain || DEFAULT_REMAIN;

        if (isVariable.value) {
            variableData.value = addCoordinate(props.data);
            lazyLoadRef.value = props.variableHeight + 'px';
        } else {
            lazyLoadRef.value = props.remain * props.lineHeight + 'px';
        }
    });

    onUpdated(() => {
        nextTick(() => {
            if (isVariable.value && renderNodeRef.value?.length) {
                const variableLength = variableData.value.length;
                const nodeLength = renderNodeRef.value.length;
                // 记录renderNodeRef node集合中高度的变化量
                let allDiff = 0;
                let maxIndex;

                renderNodeRef.value.sort((node1, node2) => node1.dataset.index - node2.dataset.index).forEach((node, nodeIdx) => {
                    // 高度由默认修正为渲染DOM高度
                    let {height} = node.getBoundingClientRect();
                    const curIdx = Math.floor(node.dataset.index);
                    const oldHeight = variableData.value[curIdx].height;

                    maxIndex = curIdx;

                    const diff = height - oldHeight;
                    if (diff) {
                        variableData.value[curIdx].height = height;
                        variableData.value[curIdx].bottom += diff;

                        allDiff += diff;

                        const minEndIdx = Math.min(curIdx + nodeLength - nodeIdx, variableLength);

                        // 控制双重循环次数，遍历renderNodeRef node时，不直接for循环到底，只循环处理node部分，剩余部分在node循环外处理
                        for (let i = curIdx + 1; i < minEndIdx; i++) {
                            variableData.value[i].top = variableData.value[i - 1].bottom;
                            variableData.value[i].bottom += diff;
                        }
                    }
                });

                // 处理剩余部分
                for (let i = maxIndex + 1; i < variableLength; i++) {
                    variableData.value[i].top = variableData.value[i - 1].bottom;
                    variableData.value[i].bottom += allDiff;
                }

                scrollBarRef.value.style.height = variableData.value[variableLength - 1].bottom + 'px';
            }
        });
    });

    const getIndex = (distance, data) => {
        let startIdx = 0;
        let endIdx = data.length - 1;
        while (startIdx <= endIdx) {
            const middleIdx = Math.floor((startIdx + endIdx) / 2);
            const middleTop = data[middleIdx].top;
            const middleBottom = data[middleIdx].bottom;

            if (distance >= middleTop && distance <= middleBottom) {
                return middleIdx;
            } else if (distance > middleBottom) {
                startIdx = middleIdx + 1;
            } else {
                endIdx = middleIdx - 1;
            }
        }

        if (distance > data[endIdx].bottom) {
            return endIdx;
        }
    };

    const onScroll = () => {
        scrollTop.value = lazyLoadRef.value.scrollTop;
        if (isVariable.value) {
            start.value = getIndex(scrollTop.value, variableData.value);
            end.value = start.value + (props.remain || DEFAULT_REMAIN);
            offset.value = variableData.value[start.value - previousCount.value].top || 0;
        } else {
            start.value = Math.floor(scrollTop.value / props.lineHeight);
            end.value = start.value + props.remain;

            offset.value = start.value * props.lineHeight - previousCount.value * props.lineHeight;
        }

        nextTick(() => {
            emitLoad();
        })
    };

    const emitLoad = () => {
        emit('load', {
            scrollTop: scrollTop.value,
            offset: offset.value,
            renderData: renderData.value,
        });
    };

</script>

<template>
    <div class="lazy-load-list" ref="lazyLoadRef" @scroll.passive="onScroll">
        <div class="scroll-bar" ref="scrollBarRef"></div>

        <div class="scroll-list" :style="`transform: translateY(${offset}px)`">
            <div v-for="item in renderData" :key="item[props.dataKey]" :data-index="item._index"
                 ref="renderNodeRef">
                <slot :item="item"></slot>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .lazy-load-list {
        position: relative;
        overflow: auto;
    }

    .lazy-load-list * {
        box-sizing: border-box;
    }

    .scroll-list {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
    }
</style>
