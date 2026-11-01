// GardenPress – plant library.
// Timing is in WEEKS relative to the average LAST SPRING FROST (negative = before):
//   si = start seeds indoors (weeks BEFORE last frost), tp = plant out / transplant, ds = direct sow outdoors.
//   ff = plant in fall, weeks BEFORE first fall frost (garlic etc.).
// sq = plants per square foot (square foot gardening); size = squares per side the plant needs (2 = 2×2 ft).
// dtm = days to maturity from planting out / sowing outside, hw = harvest window in weeks.
// sc = succession sowing every N weeks, fall = good for a fall crop.
'use strict';
const FAMILIES = {
  night: { name: 'Nightshade (tomato family)', rot: true },
  brass: { name: 'Brassica (cabbage family)', rot: true },
  legume: { name: 'Legume (pea & bean family)', rot: true },
  cucurb: { name: 'Cucurbit (squash family)', rot: true },
  allium: { name: 'Allium (onion family)', rot: true },
  umbel: { name: 'Umbellifer (carrot family)', rot: true },
  amar: { name: 'Amaranth (beet & spinach family)', rot: true },
  aster: { name: 'Aster (lettuce & sunflower family)', rot: false },
  grass: { name: 'Grass (corn)', rot: true },
  mint: { name: 'Mint family (herbs)', rot: false },
  other: { name: 'Other', rot: false },
};
const CATS = { veg: 'Vegetables', herb: 'Herbs', fruit: 'Fruit', flower: 'Flowers' };

const PLANTS = [
  // ---- nightshades
  { id: 'tomato', name: 'Tomato', ic: '🍅', col: '#e5533d', cat: 'veg', fam: 'night', sq: 1, size: 1, si: 7, tp: 1, dtm: 70, hw: 10, comp: ['basil', 'marigold', 'carrot', 'onion', 'parsley', 'chives', 'nasturtium'], avoid: ['potato', 'fennel', 'cabbage', 'kale', 'broccoli', 'cauliflower', 'corn', 'dill'], tip: 'Stake or cage at planting time. Plant deep – roots grow along the buried stem. Water evenly to avoid blossom end rot.' },
  { id: 'cherrytom', name: 'Cherry tomato', ic: '🍅', col: '#f0703f', cat: 'veg', fam: 'night', sq: 1, size: 1, si: 7, tp: 1, dtm: 60, hw: 12, comp: ['basil', 'marigold', 'carrot', 'onion', 'parsley'], avoid: ['potato', 'fennel', 'cabbage', 'kale', 'corn', 'dill'], tip: 'Very productive – one plant per square on a tall trellis or cage.' },
  { id: 'pepper', name: 'Pepper (sweet)', ic: '🫑', col: '#3f9b3a', cat: 'veg', fam: 'night', sq: 1, size: 1, si: 9, tp: 2, dtm: 70, hw: 10, comp: ['basil', 'onion', 'carrot', 'tomato', 'marigold'], avoid: ['fennel', 'kohlrabi', 'beanbush', 'beanpole'], tip: 'Needs warm soil. Wait until nights stay above 55°F (13°C) before planting out.' },
  { id: 'chili', name: 'Hot pepper', ic: '🌶️', col: '#d23a2a', cat: 'veg', fam: 'night', sq: 1, size: 1, si: 9, tp: 2, dtm: 75, hw: 10, comp: ['basil', 'onion', 'tomato', 'marigold'], avoid: ['fennel', 'kohlrabi'], tip: 'Loves heat. Pick often to keep plants producing.' },
  { id: 'eggplant', name: 'Eggplant', ic: '🍆', col: '#6a3d8f', cat: 'veg', fam: 'night', sq: 1, size: 1, si: 9, tp: 2, dtm: 75, hw: 8, comp: ['beanbush', 'marigold', 'thyme', 'pepper'], avoid: ['fennel'], tip: 'Needs heat. Cover with row cover early on to keep flea beetles off.' },
  { id: 'potato', verb: 'Plant', name: 'Potato', ic: '🥔', col: '#b08a55', cat: 'veg', fam: 'night', sq: 1, size: 1, ds: -2, dtm: 90, hw: 4, comp: ['beanbush', 'corn', 'cabbage', 'marigold', 'horseradish'], avoid: ['tomato', 'cherrytom', 'cucumber', 'zucchini', 'squash', 'pumpkin', 'sunflower', 'raspberry'], tip: 'Plant seed potatoes 4 in (10 cm) deep and hill soil around the stems as they grow.' },
  { id: 'tomatillo', name: 'Tomatillo', ic: '🟢', col: '#8bbf3a', cat: 'veg', fam: 'night', sq: 1, size: 1, si: 7, tp: 2, dtm: 75, hw: 8, comp: ['basil', 'marigold', 'onion'], avoid: ['fennel', 'potato'], tip: 'Plant at least two – tomatillos need a partner to set fruit.' },
  // ---- brassicas
  { id: 'broccoli', name: 'Broccoli', ic: '🥦', col: '#2f7d3a', cat: 'veg', fam: 'brass', sq: 1, size: 1, si: 7, tp: -2, dtm: 65, hw: 4, fall: true, comp: ['onion', 'dill', 'beet', 'celery', 'chamomile', 'nasturtium', 'lettuce'], avoid: ['tomato', 'cherrytom', 'strawberry', 'pepper'], tip: 'Cut the main head while buds are tight; side shoots keep coming for weeks.' },
  { id: 'cabbage', name: 'Cabbage', ic: '🥬', col: '#7cb342', cat: 'veg', fam: 'brass', sq: 1, size: 1, si: 7, tp: -2, dtm: 75, hw: 4, fall: true, comp: ['onion', 'dill', 'celery', 'beet', 'nasturtium', 'thyme'], avoid: ['tomato', 'strawberry', 'beanpole'], tip: 'Cover with netting to stop cabbage worms. Harvest when heads feel firm.' },
  { id: 'cauliflower', name: 'Cauliflower', ic: '🥦', col: '#d9d2b8', cat: 'veg', fam: 'brass', sq: 1, size: 1, si: 7, tp: -1, dtm: 70, hw: 2, fall: true, comp: ['onion', 'celery', 'dill', 'beanbush'], avoid: ['tomato', 'strawberry'], tip: 'Tie leaves over the head (blanching) when it is the size of an egg to keep it white.' },
  { id: 'kale', name: 'Kale', ic: '🥬', col: '#2e6b4a', cat: 'veg', fam: 'brass', sq: 1, size: 1, si: 6, tp: -3, ds: -4, dtm: 55, hw: 16, fall: true, comp: ['onion', 'beet', 'celery', 'dill', 'nasturtium'], avoid: ['tomato', 'strawberry'], tip: 'Pick the lower leaves and let the plant keep growing. Tastes sweeter after a frost.' },
  { id: 'collards', name: 'Collard greens', ic: '🥬', col: '#3d7c55', cat: 'veg', fam: 'brass', sq: 1, size: 1, si: 6, tp: -3, ds: -4, dtm: 60, hw: 14, fall: true, comp: ['onion', 'dill', 'tomato'], avoid: ['strawberry'], tip: 'Harvest outer leaves when they are 10 in (25 cm) long.' },
  { id: 'brussels', name: 'Brussels sprouts', ic: '🟢', col: '#5d8f3a', cat: 'veg', fam: 'brass', sq: 1, size: 1, si: 6, tp: 0, dtm: 100, hw: 8, comp: ['onion', 'dill', 'thyme'], avoid: ['tomato', 'strawberry'], tip: 'Slow growing – sprouts taste best after a few frosts in fall.' },
  { id: 'kohlrabi', name: 'Kohlrabi', ic: '🟣', col: '#8e6bb5', cat: 'veg', fam: 'brass', sq: 4, size: 1, si: 5, tp: -3, ds: -4, dtm: 50, hw: 3, sc: 3, fall: true, comp: ['beet', 'onion', 'lettuce'], avoid: ['tomato', 'pepper', 'strawberry'], tip: 'Harvest when the bulb is 2–3 in (5–8 cm) across – bigger ones turn woody.' },
  { id: 'bokchoy', name: 'Bok choy', ic: '🥬', col: '#9ccc65', cat: 'veg', fam: 'brass', sq: 4, size: 1, ds: -4, dtm: 45, hw: 3, sc: 3, fall: true, comp: ['onion', 'beet', 'celery'], avoid: ['strawberry'], tip: 'Bolts in heat – grow in spring and fall.' },
  { id: 'radish', name: 'Radish', ic: '🔴', col: '#e0457b', cat: 'veg', fam: 'brass', sq: 16, size: 1, ds: -4, dtm: 25, hw: 2, sc: 2, fall: true, comp: ['carrot', 'lettuce', 'cucumber', 'peas', 'spinach'], avoid: ['hyssop'], tip: 'Ready in about 4 weeks. Sow a few every two weeks for a steady supply.' },
  { id: 'turnip', name: 'Turnip', ic: '⚪', col: '#c9b6d9', cat: 'veg', fam: 'brass', sq: 9, size: 1, ds: -3, dtm: 50, hw: 3, fall: true, comp: ['peas', 'onion'], avoid: ['potato'], tip: 'Both roots and greens are edible. Harvest roots at 2–3 in (5–8 cm).' },
  { id: 'arugula', name: 'Arugula', ic: '🌿', col: '#5c9e3c', cat: 'veg', fam: 'brass', sq: 9, size: 1, ds: -4, dtm: 30, hw: 4, sc: 2, fall: true, comp: ['lettuce', 'spinach', 'carrot'], avoid: ['strawberry'], tip: 'Cut leaves young; sow again every 2 weeks in cool weather.' },
  // ---- legumes
  { id: 'peas', name: 'Peas', ic: '🫛', col: '#6ab04c', cat: 'veg', fam: 'legume', sq: 8, size: 1, ds: -6, dtm: 60, hw: 4, fall: true, comp: ['carrot', 'radish', 'cucumber', 'corn', 'turnip', 'spinach'], avoid: ['onion', 'garlic', 'leek', 'chives', 'shallot', 'scallion'], tip: 'Sow as soon as the soil can be worked. Give them a trellis to climb.' },
  { id: 'beanbush', name: 'Bush beans', ic: '🫘', col: '#4f9a52', cat: 'veg', fam: 'legume', sq: 9, size: 1, ds: 1, dtm: 55, hw: 4, sc: 3, comp: ['corn', 'cucumber', 'potato', 'carrot', 'marigold', 'strawberry'], avoid: ['onion', 'garlic', 'leek', 'chives', 'shallot', 'fennel'], tip: 'Sow after the soil warms. Pick every few days so plants keep producing.' },
  { id: 'beanpole', name: 'Pole beans', ic: '🫘', col: '#3c8c48', cat: 'veg', fam: 'legume', sq: 8, size: 1, ds: 1, dtm: 65, hw: 8, comp: ['corn', 'cucumber', 'squash', 'carrot', 'marigold'], avoid: ['onion', 'garlic', 'leek', 'beet', 'sunflower', 'fennel'], tip: 'Grow up a 6 ft (2 m) trellis on the north side of the bed so they do not shade other crops.' },
  // ---- cucurbits
  { id: 'cucumber', name: 'Cucumber', ic: '🥒', col: '#3f8f3f', cat: 'veg', fam: 'cucurb', sq: 2, size: 1, si: 3, tp: 2, ds: 2, dtm: 55, hw: 8, comp: ['beanbush', 'beanpole', 'peas', 'radish', 'dill', 'nasturtium', 'marigold', 'corn'], avoid: ['potato', 'sage'], tip: 'Grow vertically on a trellis to save space – 2 plants per square.' },
  { id: 'zucchini', name: 'Zucchini', ic: '🥒', col: '#2f6d2f', cat: 'veg', fam: 'cucurb', sq: 1, size: 2, si: 3, tp: 2, ds: 2, dtm: 50, hw: 10, comp: ['nasturtium', 'beanbush', 'corn', 'marigold'], avoid: ['potato'], tip: 'One or two plants feed a family. Pick fruit at 6–8 in (15–20 cm).' },
  { id: 'squash', name: 'Winter squash', ic: '🎃', col: '#d48a2c', cat: 'veg', fam: 'cucurb', sq: 1, size: 3, si: 3, tp: 2, ds: 2, dtm: 95, hw: 3, comp: ['corn', 'beanpole', 'nasturtium', 'marigold'], avoid: ['potato'], tip: 'Needs a lot of room or a strong trellis. Harvest when the rind is too hard to dent with a fingernail.' },
  { id: 'pumpkin', name: 'Pumpkin', ic: '🎃', col: '#f08a24', cat: 'veg', fam: 'cucurb', sq: 1, size: 3, si: 3, tp: 2, ds: 2, dtm: 105, hw: 3, comp: ['corn', 'beanpole', 'nasturtium', 'marigold'], avoid: ['potato'], tip: 'For Halloween, count back about 110 days from mid-October.' },
  { id: 'watermelon', name: 'Watermelon', ic: '🍉', col: '#3e8e41', cat: 'fruit', fam: 'cucurb', sq: 1, size: 3, si: 3, tp: 3, ds: 2, dtm: 85, hw: 3, comp: ['nasturtium', 'marigold', 'radish'], avoid: ['potato'], tip: 'Ripe when the spot on the ground turns creamy yellow and the curly tendril nearby dries.' },
  { id: 'melon', name: 'Cantaloupe', ic: '🍈', col: '#e0b050', cat: 'fruit', fam: 'cucurb', sq: 1, size: 2, si: 3, tp: 3, ds: 2, dtm: 80, hw: 3, comp: ['nasturtium', 'marigold', 'radish'], avoid: ['potato'], tip: 'Ripe when the fruit slips off the vine with a gentle push.' },
  // ---- alliums
  { id: 'onion', name: 'Onion', ic: '🧅', col: '#c79a4b', cat: 'veg', fam: 'allium', sq: 9, size: 1, si: 10, tp: -4, dtm: 100, hw: 3, comp: ['carrot', 'beet', 'lettuce', 'tomato', 'pepper', 'cabbage', 'broccoli', 'strawberry'], avoid: ['peas', 'beanbush', 'beanpole', 'sage'], tip: 'Choose long-day varieties in the north, short-day in the south. Harvest when tops fall over.' },
  { id: 'garlic', name: 'Garlic', ic: '🧄', col: '#e7dcc3', cat: 'veg', fam: 'allium', sq: 9, size: 1, ff: 6, dtm: 240, hw: 3, comp: ['tomato', 'pepper', 'carrot', 'beet', 'strawberry', 'lettuce'], avoid: ['peas', 'beanbush', 'beanpole'], tip: 'Plant cloves in fall, pointy end up, 2 in (5 cm) deep. Harvest next summer when half the leaves are brown.' },
  { id: 'leek', name: 'Leek', ic: '🌱', col: '#7fb069', cat: 'veg', fam: 'allium', sq: 9, size: 1, si: 10, tp: -2, dtm: 120, hw: 10, comp: ['carrot', 'celery', 'onion'], avoid: ['peas', 'beanbush', 'beanpole'], tip: 'Hill soil around the stems to grow long white shanks.' },
  { id: 'scallion', name: 'Green onion', ic: '🌱', col: '#8bc34a', cat: 'veg', fam: 'allium', sq: 16, size: 1, ds: -4, dtm: 60, hw: 8, sc: 3, comp: ['carrot', 'lettuce', 'tomato'], avoid: ['peas', 'beanbush'], tip: 'Cut at the base – they often regrow.' },
  { id: 'shallot', verb: 'Plant', name: 'Shallot', ic: '🧅', col: '#b5785a', cat: 'veg', fam: 'allium', sq: 4, size: 1, ds: -4, dtm: 90, hw: 3, comp: ['carrot', 'beet', 'tomato'], avoid: ['peas', 'beanbush'], tip: 'Each bulb splits into a cluster of 6–10 shallots.' },
  { id: 'chives', name: 'Chives', ic: '🌱', col: '#6fa83f', cat: 'herb', fam: 'allium', sq: 9, size: 1, si: 8, tp: -2, dtm: 80, hw: 20, comp: ['carrot', 'tomato', 'strawberry'], avoid: ['peas', 'beanbush'], tip: 'Perennial – comes back every year. Purple flowers are edible and attract bees.' },
  // ---- umbellifers
  { id: 'carrot', name: 'Carrot', ic: '🥕', col: '#f08a24', cat: 'veg', fam: 'umbel', sq: 16, size: 1, ds: -3, dtm: 70, hw: 6, sc: 3, fall: true, comp: ['tomato', 'onion', 'lettuce', 'radish', 'peas', 'chives', 'rosemary', 'sage'], avoid: ['dill', 'fennel'], tip: 'Keep the soil moist until seedlings appear (up to 3 weeks). Thin to one every 3 in (8 cm).' },
  { id: 'parsnip', name: 'Parsnip', ic: '🥕', col: '#e8dcb0', cat: 'veg', fam: 'umbel', sq: 9, size: 1, ds: -2, dtm: 120, hw: 10, comp: ['onion', 'radish'], avoid: ['carrot'], tip: 'Use fresh seed every year. Sweeter after frost.' },
  { id: 'celery', name: 'Celery', ic: '🥬', col: '#a5cf6f', cat: 'veg', fam: 'umbel', sq: 4, size: 1, si: 10, tp: 2, dtm: 100, hw: 8, comp: ['leek', 'tomato', 'beanbush', 'cabbage'], avoid: ['carrot', 'parsnip'], tip: 'Thirsty – never let it dry out.' },
  { id: 'parsley', name: 'Parsley', ic: '🌿', col: '#3f9a4a', cat: 'herb', fam: 'umbel', sq: 4, size: 1, si: 8, tp: -2, dtm: 75, hw: 20, comp: ['tomato', 'asparagus', 'pepper'], avoid: ['lettuce'], tip: 'Seeds are slow – soak them overnight before sowing.' },
  { id: 'cilantro', name: 'Cilantro', ic: '🌿', col: '#58a65c', cat: 'herb', fam: 'umbel', sq: 9, size: 1, ds: -2, dtm: 50, hw: 3, sc: 3, fall: true, comp: ['spinach', 'beanbush', 'peas'], avoid: ['fennel'], tip: 'Bolts in heat – sow small amounts every 3 weeks.' },
  { id: 'dill', name: 'Dill', ic: '🌿', col: '#7bb661', cat: 'herb', fam: 'umbel', sq: 1, size: 1, ds: 0, dtm: 50, hw: 6, sc: 4, comp: ['cucumber', 'cabbage', 'broccoli', 'onion', 'lettuce'], avoid: ['carrot', 'tomato', 'fennel'], tip: 'Attracts helpful insects. Let a few plants flower and self-seed.' },
  { id: 'fennel', name: 'Fennel', ic: '🌿', col: '#a7c957', cat: 'herb', fam: 'umbel', sq: 1, size: 1, ds: 0, dtm: 80, hw: 6, comp: [], avoid: ['tomato', 'beanbush', 'beanpole', 'pepper', 'carrot', 'dill', 'cilantro', 'kohlrabi'], tip: 'Inhibits most vegetables – grow it on its own, away from the main beds.' },
  // ---- amaranth family
  { id: 'spinach', name: 'Spinach', ic: '🍃', col: '#2f8a4a', cat: 'veg', fam: 'amar', sq: 9, size: 1, ds: -6, dtm: 40, hw: 4, sc: 2, fall: true, comp: ['strawberry', 'peas', 'radish', 'cilantro'], avoid: [], tip: 'Bolts when days get long and hot – grow in spring and fall.' },
  { id: 'chard', name: 'Swiss chard', ic: '🥬', col: '#c0392b', cat: 'veg', fam: 'amar', sq: 4, size: 1, ds: -2, dtm: 55, hw: 20, fall: true, comp: ['onion', 'cabbage', 'beanbush'], avoid: [], tip: 'Pick outer leaves all season – one sowing lasts until hard frost.' },
  { id: 'beet', name: 'Beet', ic: '🟣', col: '#9b2d55', cat: 'veg', fam: 'amar', sq: 9, size: 1, ds: -2, dtm: 55, hw: 4, sc: 3, fall: true, comp: ['onion', 'lettuce', 'cabbage', 'kohlrabi', 'garlic'], avoid: ['beanpole'], tip: 'Each seed is a cluster – thin to one seedling per spot.' },
  // ---- aster family
  { id: 'lettuce', name: 'Lettuce', ic: '🥬', col: '#8bc34a', cat: 'veg', fam: 'aster', sq: 4, size: 1, si: 5, tp: -3, ds: -4, dtm: 50, hw: 4, sc: 2, fall: true, comp: ['carrot', 'radish', 'onion', 'strawberry', 'cucumber', 'chives'], avoid: ['parsley'], tip: 'Sow a little every 2 weeks. Shade it in summer to slow bolting.' },
  { id: 'leaflettuce', name: 'Leaf lettuce mix', ic: '🥗', col: '#a4d65e', cat: 'veg', fam: 'aster', sq: 9, size: 1, ds: -4, dtm: 35, hw: 4, sc: 2, fall: true, comp: ['carrot', 'radish', 'onion'], avoid: [], tip: 'Cut-and-come-again: snip leaves 1 in (2.5 cm) above the soil.' },
  { id: 'sunflower', name: 'Sunflower', ic: '🌻', col: '#f4c430', cat: 'flower', fam: 'aster', sq: 1, size: 1, ds: 1, dtm: 80, hw: 4, comp: ['cucumber', 'corn'], avoid: ['potato', 'beanpole'], tip: 'Plant on the north side so it does not shade shorter crops.' },
  { id: 'marigold', name: 'Marigold', ic: '🌼', col: '#f5a623', cat: 'flower', fam: 'aster', sq: 4, size: 1, si: 6, tp: 1, ds: 1, dtm: 50, hw: 16, comp: ['tomato', 'pepper', 'beanbush', 'cucumber', 'squash', 'potato'], avoid: [], tip: 'A classic companion – tuck them at bed corners to attract pollinators.' },
  { id: 'zinnia', name: 'Zinnia', ic: '🌸', col: '#e75480', cat: 'flower', fam: 'aster', sq: 4, size: 1, ds: 1, dtm: 70, hw: 12, comp: ['tomato', 'cucumber'], avoid: [], tip: 'Cut flowers often – the more you cut, the more they bloom.' },
  { id: 'calendula', name: 'Calendula', ic: '🌼', col: '#f39c12', cat: 'flower', fam: 'aster', sq: 4, size: 1, ds: -2, dtm: 55, hw: 14, comp: ['tomato', 'carrot', 'asparagus'], avoid: [], tip: 'Edible petals; tolerates light frost.' },
  // ---- grass
  { id: 'corn', name: 'Sweet corn', ic: '🌽', col: '#e6c229', cat: 'veg', fam: 'grass', sq: 4, size: 1, ds: 2, dtm: 75, hw: 2, comp: ['beanpole', 'beanbush', 'squash', 'pumpkin', 'cucumber', 'peas'], avoid: ['tomato'], tip: 'Plant in a block of at least 4×4 squares, not a single row, so it pollinates well.' },
  // ---- mint family herbs
  { id: 'basil', name: 'Basil', ic: '🌿', col: '#3e9d3e', cat: 'herb', fam: 'mint', sq: 4, size: 1, si: 6, tp: 2, ds: 2, dtm: 60, hw: 12, comp: ['tomato', 'pepper', 'oregano'], avoid: ['sage', 'rue'], tip: 'Pinch off flower buds to keep leaves coming. Hates cold – plant after it is warm.' },
  { id: 'thyme', name: 'Thyme', ic: '🌿', col: '#7d9a5a', cat: 'herb', fam: 'mint', sq: 4, size: 1, si: 8, tp: 0, dtm: 85, hw: 20, comp: ['cabbage', 'eggplant', 'tomato', 'strawberry'], avoid: [], tip: 'Perennial. Likes dry, sunny spots.' },
  { id: 'oregano', name: 'Oregano', ic: '🌿', col: '#6b8f4e', cat: 'herb', fam: 'mint', sq: 1, size: 1, si: 8, tp: 0, dtm: 80, hw: 20, comp: ['tomato', 'pepper', 'basil'], avoid: [], tip: 'Perennial that spreads – trim it often.' },
  { id: 'sage', name: 'Sage', ic: '🌿', col: '#8aa399', cat: 'herb', fam: 'mint', sq: 1, size: 1, si: 8, tp: 0, dtm: 75, hw: 20, comp: ['cabbage', 'carrot', 'rosemary'], avoid: ['cucumber', 'onion', 'basil'], tip: 'Perennial. Do not overwater.' },
  { id: 'rosemary', name: 'Rosemary', ic: '🌿', col: '#5f7f6e', cat: 'herb', fam: 'mint', sq: 1, size: 1, si: 10, tp: 1, dtm: 90, hw: 20, comp: ['cabbage', 'beanbush', 'carrot', 'sage'], avoid: [], tip: 'Not frost hardy in cold zones – grow in a pot you can bring indoors.' },
  { id: 'mint', name: 'Mint', ic: '🌱', col: '#4caf7d', cat: 'herb', fam: 'mint', sq: 1, size: 1, tp: 0, dtm: 60, hw: 20, comp: ['cabbage', 'tomato'], avoid: ['parsley'], tip: 'Spreads everywhere – grow it in a container, not in the bed.' },
  // ---- other
  { id: 'okra', name: 'Okra', ic: '🌱', col: '#6aa84f', cat: 'veg', fam: 'other', sq: 1, size: 1, si: 4, tp: 3, ds: 3, dtm: 60, hw: 10, comp: ['pepper', 'eggplant', 'cucumber'], avoid: [], tip: 'Loves heat. Pick pods at 3–4 in (8–10 cm) every other day.' },
  { id: 'sweetpotato', name: 'Sweet potato', ic: '🍠', col: '#b5523b', cat: 'veg', fam: 'other', sq: 1, size: 1, tp: 3, dtm: 100, hw: 3, comp: ['beanbush', 'thyme'], avoid: ['squash'], tip: 'Plant rooted slips when the soil is warm. Dig before the first frost.' },
  { id: 'strawberry', name: 'Strawberry', ic: '🍓', col: '#e53950', cat: 'fruit', fam: 'other', sq: 4, size: 1, tp: -2, dtm: 90, hw: 4, comp: ['beanbush', 'lettuce', 'spinach', 'onion', 'thyme', 'borage'], avoid: ['cabbage', 'broccoli', 'cauliflower', 'kale'], tip: 'Perennial. June-bearing types fruit the year after planting; everbearing fruit the same summer.' },
  { id: 'nasturtium', name: 'Nasturtium', ic: '🌺', col: '#f2711c', cat: 'flower', fam: 'other', sq: 1, size: 1, ds: 1, dtm: 50, hw: 14, comp: ['cucumber', 'squash', 'tomato', 'cabbage', 'radish'], avoid: [], tip: 'A trap crop for aphids. Leaves and flowers are edible.' },
  { id: 'lavender', name: 'Lavender', ic: '💜', col: '#9b7fd1', cat: 'flower', fam: 'mint', sq: 1, size: 1, si: 10, tp: 2, dtm: 100, hw: 8, comp: ['cabbage', 'tomato'], avoid: [], tip: 'Perennial. Needs sharp drainage and full sun.' },
  { id: 'borage', name: 'Borage', ic: '💙', col: '#5b7fd1', cat: 'herb', fam: 'other', sq: 1, size: 1, ds: -1, dtm: 55, hw: 12, comp: ['strawberry', 'tomato', 'squash'], avoid: [], tip: 'Bees love it. Self-seeds freely.' },
];
const PLANT = Object.fromEntries(PLANTS.map((p) => [p.id, p]));

// Approximate average frost dates by USDA hardiness zone (MM-DD). Local dates vary – users can edit them.
const ZONES = {
  '3': ['05-15', '09-15'], '4': ['05-10', '09-25'], '5': ['04-30', '10-10'], '6': ['04-20', '10-20'],
  '7': ['04-10', '10-30'], '8': ['03-25', '11-15'], '9': ['02-28', '12-05'], '10': ['01-30', '12-20'],
};
