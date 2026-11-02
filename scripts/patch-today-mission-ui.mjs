import {readFileSync,writeFileSync} from 'node:fs';

const appPath='today/app.js';
let s=readFileSync(appPath,'utf8');
const must=(oldValue,newValue,label)=>{if(!s.includes(oldValue))throw new Error(`missing app anchor: ${label}`);s=s.replace(oldValue,newValue);};

must("const titleUsesSummary=(article,level)=>BEGINNER_TITLE_LEVELS.has(level)&&!article.titleJa&&Boolean(article.summaryJa);",
`const titleUsesSummary=(article,level)=>BEGINNER_TITLE_LEVELS.has(level)&&!article.titleJa&&Boolean(article.summaryJa);\nconst MISSION_LABELS={decision:'決める',prediction:'予想する',advice:'アドバイス',ranking:'比べる',personal:'自分とつなぐ',recommendation:'おすすめする','information-hunt':'情報を見つける'};\nconst missionLabel=type=>MISSION_LABELS[type]||'考える';`,
'mission labels');

must("const response=await fetch('./news.json?v=2026-10-31-eiken5'",
"const response=await fetch('./news.json?v=2026-11-02-missions'",
'news cache version');

must("  const summary=titleUsesSummary(current,currentLevel)?'':(current.summaryJa||'');\n  app.innerHTML=",
`  const summary=titleUsesSummary(current,currentLevel)?'':(current.summaryJa||'');\n  const mission=current.mission;\n  const missionQuestion=mission?.questions?.[currentLevel]||'';\n  const missionHtml=mission&&missionQuestion?\`<section class="mission-card" aria-label="TODAY'S MISSION"><div class="mission-kicker"><span>🎯 TODAY'S MISSION</span><span class="mission-type">\${esc(missionLabel(mission.type))}</span></div><p class="mission-purpose">\${esc(mission.purposeJa||'この記事を読む目的を確認しよう。')}</p><div class="mission-question" lang="en">\${esc(missionQuestion)}</div>\${mission.followUpJa?\`<p class="mission-follow">\${esc(mission.followUpJa)}</p>\`:''}</section>\`:'';\n  app.innerHTML=`,
'mission render variables');

must("</div><div class=\"article-text\" lang=\"en\">${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div></article>",
"</div>${missionHtml}<div class=\"article-text\" lang=\"en\">${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div></article>",
'mission card placement');

writeFileSync(appPath,s,'utf8');

const stylePath='today/style.css';
let css=readFileSync(stylePath,'utf8');
if(!css.includes('.mission-card{')){
  css+=`\n\n/* Purposeful reading mission */\n.mission-card{margin:10px 0 24px;padding:16px 17px;border:1px solid #e2c88d;border-radius:15px;background:linear-gradient(145deg,#fff8e7,#fffdf8)}\n.mission-kicker{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#8a6428;font-size:10px;font-weight:950;letter-spacing:.08em}\n.mission-type{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#f5e6bd;color:#6f531f;letter-spacing:0}\n.mission-purpose{margin:10px 0 7px;color:#64736c;font-size:11px;line-height:1.65}\n.mission-question{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:clamp(18px,3vw,24px);font-weight:850;line-height:1.45;color:#183c37}\n.mission-follow{margin:8px 0 0;color:#7d6b47;font-size:10.5px;line-height:1.6}\n.mission-card{background:color-mix(in srgb,var(--today-surface) 84%,#f5d88f 16%);border-color:color-mix(in srgb,var(--today-border) 62%,#c99b45 38%)}\n.mission-question{color:var(--today-foreground)}\n.mission-purpose,.mission-follow{color:var(--today-muted)}\n.mission-type{background:var(--today-soft-surface);color:var(--today-foreground)}\n@media(max-width:540px){.mission-card{padding:14px;margin-bottom:20px}.mission-kicker{align-items:flex-start}.mission-question{font-size:19px}}\n`;
}
writeFileSync(stylePath,css,'utf8');

const indexPath='today/index.html';
let html=readFileSync(indexPath,'utf8');
html=html.replace('./style.css?v=2.1.60','./style.css?v=2.1.61').replace('./app.js?v=2.2.5','./app.js?v=2.2.6');
writeFileSync(indexPath,html,'utf8');
