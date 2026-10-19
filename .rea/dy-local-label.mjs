import { resolveDouyin } from '../src/resolvers/index.js';
const r = await resolveDouyin('https://v.douyin.com/DJUL3bv7jEA/', {});
r.videos.forEach(v => console.log('-', v.label));
