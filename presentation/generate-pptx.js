const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaHeart, FaUsers, FaSearch, FaChartLine, FaShieldAlt, FaBolt } = require("react-icons/fa");
const { MdOutlineTransparency, MdEventAvailable, MdVolunteerActivism } = require("react-icons/md");

async function iconToBase64Png(IconComponent, color, size = 256) {
  const cssColor = color.startsWith('#') ? color : `#${color}`;
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color: cssColor, size: String(size) })
  );
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

const makeShadow = () => ({ type: "outer", blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.09 });
const makeMedShadow = () => ({ type: "outer", blur: 16, offset: 5, angle: 135, color: "000000", opacity: 0.18 });

async function createPresentation() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.title = "VoloHero — Investor Pitch Deck 2025";
  pres.author = "VolunteerHub";

  // === PALETTE ===
  const E  = "10B981";     // emerald
  const ED = "064E3B";     // dark emerald (titles, CTA bg)
  const EM = "059669";     // mid emerald
  const EL = "D1FAE5";     // light emerald
  const EP = "ECFDF5";     // pale emerald
  const EG = "A7F3D0";     // soft emerald glow
  const W  = "FFFFFF";
  const S9 = "0F172A";     // slate-900
  const S7 = "334155";     // slate-700
  const S5 = "64748B";     // slate-500
  const S2 = "E2E8F0";     // slate-200
  const S1 = "F1F5F9";     // slate-100
  const S0 = "F8FAFC";     // slate-50

  // Pre-render icons
  const iconHeart  = await iconToBase64Png(FaHeart,   W, 512);
  const iconSearch = await iconToBase64Png(FaSearch,  E, 512);
  const iconUsers  = await iconToBase64Png(FaUsers,   E, 512);
  const iconChart  = await iconToBase64Png(FaChartLine,E,512);
  const iconShield = await iconToBase64Png(FaShieldAlt,E,512);
  const iconBolt   = await iconToBase64Png(FaBolt,    E, 512);
  const iconVol    = await iconToBase64Png(MdVolunteerActivism, W, 512);

  // ── Helper: slide number badge ──
  function addNum(slide, n) {
    slide.addText(String(n).padStart(2,"0"), {
      x:9.1, y:0.12, w:0.8, h:0.32,
      fontSize:10, color:S5, align:"right", fontFace:"Calibri", margin:0
    });
  }

  // ── Helper: top emerald rule ──
  function addRule(slide) {
    slide.addShape(pres.shapes.RECTANGLE, {
      x:0, y:0, w:10, h:0.06, fill:{color:E}, line:{color:E}
    });
  }

  // ── Helper: slide title ──
  function addTitle(slide, text, color=S9) {
    slide.addText(text, {
      x:0.45, y:0.13, w:8.5, h:0.72,
      fontSize:28, color, bold:true, fontFace:"Arial Black",
      charSpacing:0
    });
  }

  // ── Helper: italics subtitle ──
  function addSub(slide, text, color=S5) {
    slide.addText(text, {
      x:0.45, y:0.82, w:9.0, h:0.32,
      fontSize:13, color, italic:true, fontFace:"Calibri"
    });
  }

  // ============================================================
  // SLIDE 1 — TITLE
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: ED };
    // Ambient glows
    [["-1","-0.5","5","5","88"],["7","2.5","4","4","91"],["2.5","4.2","2.5","2.5","93"]].forEach(([x,y,w,h,t])=>
      s.addShape(pres.shapes.OVAL, {x:+x,y:+y,w:+w,h:+h,
        fill:{color:E,transparency:+t}, line:{color:E,transparency:+t}})
    );
    // Logo card
    s.addShape(pres.shapes.ROUNDED_RECTANGLE,{
      x:4.0,y:0.55,w:2.0,h:2.0, rectRadius:0.28,
      fill:{color:E}, line:{color:E},
      shadow:{ type:"outer",blur:24,offset:6,angle:135,color:"000000",opacity:0.45 }
    });
    s.addImage({ data: iconHeart, x:4.35, y:0.9, w:1.3, h:1.3 });
    // Brand name
    s.addText("VoloHero", {
      x:0.5, y:2.68, w:9, h:1.05,
      fontSize:72, color:W, bold:true, align:"center",
      fontFace:"Arial Black", charSpacing:2
    });
    // Tagline
    s.addText("Платформа, которая соединяет сердца с делами", {
      x:1, y:3.75, w:8, h:0.52,
      fontSize:19, color:E, italic:true, align:"center", fontFace:"Calibri"
    });
    // Slogan pill
    s.addShape(pres.shapes.ROUNDED_RECTANGLE,{
      x:2.5, y:4.36, w:5, h:0.46, rectRadius:0.15,
      fill:{color:"0F3B2D"}, line:{color:EM, width:1}
    });
    s.addText('"Сайт для тех, кто хочет улучшить мир"', {
      x:2.5, y:4.36, w:5, h:0.46,
      fontSize:12.5, color:EG, align:"center", valign:"middle", fontFace:"Calibri"
    });
    s.addText("Investor Pitch  ·  2025  ·  Seed Round", {
      x:0, y:5.22, w:10, h:0.3,
      fontSize:10, color:"4ADE80", align:"center", fontFace:"Calibri"
    });
  }

  // ============================================================
  // SLIDE 2 — PROBLEM
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: W };
    addRule(s); addNum(s, 2);
    addTitle(s, "Мир хочет меняться. Но где начать?");
    addSub(s,   "Три барьера, которые держат миллионы в стороне");
    const cards = [
      { stat:"73%",  line1:"хотят волонтёрить,", line2:"но не знают как начать", accent:"EF4444" },
      { stat:"40ч+", line1:"организаторы тратят каждый", line2:"месяц на поиск волонтёров",  accent:"F59E0B" },
      { stat:"0%",   line1:"прозрачности: куда идут", line2:"пожертвования?",  accent:"8B5CF6" },
      { stat:"Хаос", line1:"Telegram / Instagram /", line2:"сарафанное радио",  accent:"EC4899" },
    ];
    const positions = [{x:0.3,y:1.2},{x:5.15,y:1.2},{x:0.3,y:3.15},{x:5.15,y:3.15}];
    const cw=4.6, ch=1.75;
    cards.forEach((c,i)=>{
      const {x,y} = positions[i];
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:cw,h:ch, fill:{color:S0}, line:{color:S2,width:1}, shadow:makeShadow()});
      // Left accent
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:0.07,h:ch, fill:{color:c.accent}, line:{color:c.accent}});
      s.addText(c.stat, {
        x:x+0.18, y:y+0.13, w:3.8, h:0.68,
        fontSize:42, color:S9, bold:true, fontFace:"Arial Black", margin:0
      });
      s.addText([
        { text: c.line1, options:{breakLine:true} },
        { text: c.line2 }
      ], {
        x:x+0.18, y:y+0.82, w:cw-0.32, h:0.78,
        fontSize:13.5, color:S7, fontFace:"Calibri"
      });
    });
  }

  // ============================================================
  // SLIDE 3 — SOLUTION
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: EP };
    addRule(s); addNum(s, 3);
    addTitle(s, "Один клик — и ты герой", ED);
    addSub(s, "Каждый хочет быть героем. Мы даём им эту возможность.", EM);
    const cards = [
      { icon: iconSearch, bg: EP, title:"Умный поиск",       desc:"По срочности, локации и категории — найди событие за 30 секунд" },
      { icon: iconUsers,  bg: EP, title:"Единая платформа",  desc:"Волонтёры, организаторы и доноры — все в одной экосистеме" },
      { icon: iconBolt,   bg: EP, title:"Прозрачность",      desc:"Каждое пожертвование с отчётом. Никакого чёрного ящика." },
      { icon: iconChart,  bg: EP, title:"Premium-инструменты",desc:"Аналитика impact, приоритет в ленте, CSV-экспорт для профи" },
    ];
    const sw=2.1, sh=3.5;
    cards.forEach((c,i)=>{
      const x=0.3+i*(sw+0.28), y=1.1;
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:sw,h:sh, fill:{color:W}, line:{color:EL,width:1}, shadow:makeShadow()});
      // Top bar
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:sw,h:0.08, fill:{color:E}, line:{color:E}});
      // Icon circle
      s.addShape(pres.shapes.OVAL,{x:x+(sw-0.9)/2, y:y+0.25, w:0.9, h:0.9, fill:{color:EL}, line:{color:EL}});
      s.addImage({ data: c.icon, x:x+(sw-0.9)/2+0.15, y:y+0.25+0.15, w:0.6, h:0.6 });
      s.addText(c.title,{
        x:x+0.1, y:y+1.3, w:sw-0.2, h:0.5,
        fontSize:13.5, color:ED, bold:true, align:"center", fontFace:"Arial"
      });
      s.addText(c.desc,{
        x:x+0.12, y:y+1.85, w:sw-0.24, h:1.45,
        fontSize:11.5, color:S7, align:"center", fontFace:"Calibri"
      });
    });
  }

  // ============================================================
  // SLIDE 4 — PRODUCT (HOW IT WORKS)
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: W };
    addRule(s); addNum(s, 4);
    addTitle(s, "Как это работает");
    addSub(s, "Три роли. Одна платформа. Измеримый результат.");
    const flows = [
      { title:"🙋  Волонтёр", accent:"3B82F6", steps:["Зарегистрируйся","Найди событие по фильтрам","Откликнись 1 кнопкой","Получи Impact-badge"] },
      { title:"🏢  Организатор", accent:E, steps:["Создай событие","Управляй откликами","Проведи мероприятие","Опубликуй отчёт"] },
      { title:"💝  Донор", accent:"8B5CF6", steps:["Выбери проект","Пожертвуй любую сумму","Получи автоотчёт","Увидь свой вклад"] },
    ];
    const cw=2.9, ch=4.25;
    flows.forEach((f,i)=>{
      const x=0.3+i*(cw+0.25), y=1.05;
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:cw,h:ch, fill:{color:S0}, line:{color:S2,width:1}, shadow:makeShadow()});
      // Header
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:cw,h:0.62, fill:{color:f.accent}, line:{color:f.accent}});
      s.addText(f.title,{x:x+0.1,y,w:cw-0.2,h:0.62, fontSize:14.5, color:W, bold:true, align:"center", valign:"middle", fontFace:"Arial"});
      f.steps.forEach((step,j)=>{
        const sy = y+0.78+j*0.84;
        // Numbered circle
        s.addShape(pres.shapes.OVAL,{x:x+0.22,y:sy, w:0.38,h:0.38, fill:{color:f.accent}, line:{color:f.accent}});
        s.addText(String(j+1),{x:x+0.22,y:sy, w:0.38,h:0.38, fontSize:13, color:W, bold:true, align:"center", valign:"middle", fontFace:"Arial"});
        // Step text
        s.addText(step,{x:x+0.7,y:sy+0.02, w:cw-0.85,h:0.38, fontSize:12.5, color:S7, valign:"middle", fontFace:"Calibri"});
        // Connector
        if(j<f.steps.length-1)
          s.addShape(pres.shapes.LINE,{x:x+0.41,y:sy+0.38, w:0,h:0.44, line:{color:f.accent,width:1,dashType:"dash"}});
      });
    });
  }

  // ============================================================
  // SLIDE 5 — MARKET
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: W };
    addRule(s); addNum(s, 5);
    addTitle(s, "Рынок, который растёт вместе с обществом");
    addSub(s, "Первая специализированная платформа волонтёрства в Центральной Азии");
    // TAM / SAM / SOM nested ellipses (left)
    const ellipses = [
      { x:0.25, y:1.1,  w:4.6, h:4.2, fill:EL,   border:E,  label:"TAM  $45B", sub:"Глобальный рынок" },
      { x:0.75, y:1.65, w:3.6, h:3.1, fill:"B7F5D8", border:EM, label:"SAM  $320M", sub:"Рынок СНГ" },
      { x:1.35, y:2.3,  w:2.4, h:1.95,fill:E,    border:ED, label:"SOM  $12M", sub:"Узбекистан" },
    ];
    ellipses.forEach(e=>{
      s.addShape(pres.shapes.OVAL,{x:e.x,y:e.y,w:e.w,h:e.h, fill:{color:e.fill}, line:{color:e.border,width:2}});
    });
    // Labels for TAM and SAM above circles
    s.addText("TAM — $45B",{  x:0.3,  y:1.1,  w:2, h:0.35, fontSize:11, color:ED, bold:true, fontFace:"Arial"});
    s.addText("Мировой рынок",{ x:0.3,y:1.42,w:2,h:0.3,fontSize:9.5,color:EM,fontFace:"Calibri"});
    s.addText("SAM — $320M",{ x:0.85, y:1.7,  w:2, h:0.35, fontSize:11, color:ED, bold:true, fontFace:"Arial"});
    s.addText("Рынок СНГ",{   x:0.85,y:2.02,w:2,h:0.3,fontSize:9.5,color:EM,fontFace:"Calibri"});
    s.addText("SOM",{         x:2.15, y:2.35, w:1, h:0.32, fontSize:11.5, color:W, bold:true, align:"center", fontFace:"Arial"});
    s.addText("$12M",{        x:2.05, y:2.65, w:1.2,h:0.38, fontSize:16, color:W, bold:true, align:"center", fontFace:"Arial Black"});
    s.addText("Узбекистан",{  x:2.0,  y:3.0,  w:1.3,h:0.28, fontSize:9, color:EG, align:"center", fontFace:"Calibri"});
    // Right stat cards (2×2)
    const stats = [
      { val:"14%",  label:"Ежегодный рост CAGR",      accent:E   },
      { val:"36M+", label:"Молодёжь 18–35 лет в СНГ", accent:"3B82F6" },
      { val:"#1",   label:"Первые в Узбекистане",      accent:"F59E0B" },
      { val:"2027", label:"Старт экспансии в СНГ",     accent:"8B5CF6" },
    ];
    stats.forEach((st,i)=>{
      const col=i%2, row=Math.floor(i/2);
      const x=5.15+col*2.35, y=1.12+row*2.2;
      const w=2.15, h=1.85;
      s.addShape(pres.shapes.RECTANGLE,{x,y,w,h, fill:{color:S0}, line:{color:S2}, shadow:makeShadow()});
      s.addShape(pres.shapes.RECTANGLE,{x,y,w,h:0.07, fill:{color:st.accent}, line:{color:st.accent}});
      s.addText(st.val,{ x:x+0.1,y:y+0.2,w:w-0.2,h:0.75, fontSize:38, color:st.accent, bold:true, align:"center", fontFace:"Arial Black"});
      s.addText(st.label,{x:x+0.1,y:y+0.98,w:w-0.2,h:0.7, fontSize:11.5, color:S7, align:"center", fontFace:"Calibri"});
    });
  }

  // ============================================================
  // SLIDE 6 — BUSINESS MODEL
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: S0 };
    addRule(s); addNum(s, 6);
    addTitle(s, "Делаем добро с устойчивой экономикой");
    addSub(s, "Добро может быть устойчивым бизнесом.");
    // FREE column
    const freeTick  = "334155";
    const freeCross = "CBD5E1";
    s.addShape(pres.shapes.RECTANGLE,{x:0.3,y:1.18,w:2.9,h:4.2, fill:{color:W}, line:{color:S2}, shadow:makeShadow()});
    s.addShape(pres.shapes.RECTANGLE,{x:0.3,y:1.18,w:2.9,h:0.55, fill:{color:S1}, line:{color:S1}});
    s.addText("FREE",{x:0.3,y:1.18,w:2.9,h:0.55, fontSize:16, color:S7, bold:true, align:"center", valign:"middle", fontFace:"Arial"});
    const freeRows = [
      {t:"Создание профиля",     ok:true},
      {t:"3 события / месяц",   ok:true},
      {t:"Базовые заявки",      ok:true},
      {t:"Impact-аналитика",    ok:false},
      {t:"CSV-экспорт",         ok:false},
      {t:"Приоритет в ленте",   ok:false},
    ];
    freeRows.forEach((r,i)=>{
      const y=1.88+i*0.54;
      s.addText(r.ok?"✓":"✗",{x:0.42,y,w:0.35,h:0.48, fontSize:15, color:r.ok?E:freeCross, bold:true, align:"center", fontFace:"Calibri"});
      s.addText(r.t,{x:0.82,y,w:2.25,h:0.48, fontSize:12.5, color:r.ok?S7:freeCross, valign:"middle", fontFace:"Calibri"});
    });
    // PREMIUM column (elevated)
    s.addShape(pres.shapes.RECTANGLE,{x:3.35,y:0.88,w:3.1,h:4.65, fill:{color:ED}, line:{color:ED},
      shadow:{type:"outer",blur:20,offset:7,angle:135,color:"000000",opacity:0.3}});
    // Popular badge
    s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:4.32,y:0.62,w:1.16,h:0.36, rectRadius:0.1,
      fill:{color:E}, line:{color:E}});
    s.addText("★ ПОПУЛЯРНЫЙ",{x:4.32,y:0.62,w:1.16,h:0.36, fontSize:8, color:W, bold:true, align:"center", valign:"middle", fontFace:"Arial"});
    s.addText("PREMIUM 💎",{x:3.35,y:0.88,w:3.1,h:0.58, fontSize:18, color:W, bold:true, align:"center", valign:"middle", fontFace:"Arial"});
    s.addText("50,000 UZS / мес",{x:3.35,y:1.46,w:3.1,h:0.36, fontSize:14, color:EG, align:"center", fontFace:"Calibri"});
    s.addText("(~$4 / месяц)",{x:3.35,y:1.8,w:3.1,h:0.28, fontSize:11, color:"6EE7B7", align:"center", italic:true, fontFace:"Calibri"});
    const premRows = ["✓  Безлимит публикаций","✓  Приоритет в ленте","✓  Impact-аналитика","✓  CSV-экспорт","✓  Корпоративный профиль","✓  Приоритетная поддержка"];
    s.addText(
      premRows.map((r,i)=>({ text:r, options:{ breakLine:i<premRows.length-1, color:"D1FAE5" }})),
      { x:3.55, y:2.18, w:2.7, h:3.1, fontSize:13, fontFace:"Calibri" }
    );
    // B2B + Donates
    const rightCards = [
      {title:"🏦  Донаты",  desc:"0% комиссия. Полная прозрачность.\nПланируем: fee 2% в 2027."},
      {title:"🤝  B2B",     desc:"Корпоративное волонтёрство.\nКастомные отчёты. → Q2 2026"},
    ];
    rightCards.forEach((c,i)=>{
      const y=1.18+i*2.25;
      s.addShape(pres.shapes.RECTANGLE,{x:6.65,y,w:3.05,h:2.0, fill:{color:W}, line:{color:S2}, shadow:makeShadow()});
      s.addShape(pres.shapes.RECTANGLE,{x:6.65,y,w:0.07,h:2.0, fill:{color:E}, line:{color:E}});
      s.addText(c.title,{x:6.84,y:y+0.15,w:2.7,h:0.42, fontSize:14, color:S9, bold:true, fontFace:"Arial"});
      s.addText(c.desc, {x:6.84,y:y+0.62,w:2.7,h:1.2,  fontSize:12, color:S7, fontFace:"Calibri"});
    });
  }

  // ============================================================
  // SLIDE 7 — TRACTION
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: W };
    addRule(s); addNum(s, 7);
    addTitle(s, "Мы уже движемся");
    addSub(s, "MVP запущен. Данные актуальны на дату встречи.");
    const metrics = [
      { val:"XXX",  label:"Зарегистрированных\nпользователей", accent:E   },
      { val:"XX",   label:"Активных событий\nна платформе",   accent:"3B82F6" },
      { val:"XX%",  label:"Рост месяц\nк месяцу",             accent:"8B5CF6" },
      { val:"XX",   label:"Прошедших\nмероприятий",           accent:EM  },
      { val:"XX",   label:"Premium-\nподписчиков",            accent:"F59E0B" },
      { val:"X M",  label:"UZS собрано\nв донатах",           accent:"EC4899" },
    ];
    const mw=2.9, mh=1.72;
    metrics.forEach((m,i)=>{
      const col=i%3, row=Math.floor(i/3);
      const x=0.3+col*(mw+0.2), y=1.08+row*2.0;
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:mw,h:mh, fill:{color:S0}, line:{color:S2}, shadow:makeShadow()});
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:mw,h:0.07, fill:{color:m.accent}, line:{color:m.accent}});
      s.addText(m.val,{x:x+0.12,y:y+0.17,w:mw-0.24,h:0.72, fontSize:40, color:m.accent, bold:true, align:"center", fontFace:"Arial Black"});
      s.addText(m.label,{x:x+0.1,y:y+0.93,w:mw-0.2,h:0.7, fontSize:11.5, color:S7, align:"center", fontFace:"Calibri"});
    });
  }

  // ============================================================
  // SLIDE 8 — COMPETITION
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: W };
    addRule(s); addNum(s, 8);
    addTitle(s, "Мы не первые. Но мы — другие.");
    addSub(s, "Измеримые преимущества по каждому критерию.");
    const headers  = ["Критерий","Telegram","Соцсети","Другие","VoloHero ✓"];
    const colW     = [1.92, 1.7, 1.7, 1.7, 1.78];
    const startX   = 0.3;
    const hdrBg    = [S1, S1, S1, S1, ED];
    const hdrColor = [S7, S7, S7, S7, W];
    const hY = 1.1, hH = 0.52;
    let cx = startX;
    headers.forEach((h,i)=>{
      s.addShape(pres.shapes.RECTANGLE,{x:cx,y:hY,w:colW[i],h:hH, fill:{color:hdrBg[i]}, line:{color:S2,width:1}});
      s.addText(h,{x:cx+0.05,y:hY,w:colW[i]-0.1,h:hH, fontSize:11, color:hdrColor[i], bold:true, align:"center", valign:"middle", fontFace:"Arial"});
      cx+=colW[i];
    });
    const rows = [
      ["Структура данных",   "✗","✗","Частично","✓"],
      ["Умный поиск",        "✗","Алгоритм","Базовый","✓ Smart"],
      ["Прозрачность донатов","✗","✗","✗","✓ 100%"],
      ["Монетизация",        "✗","✗","✗","✓ Freemium"],
      ["Impact-аналитика",   "✗","✗","Нет","✓ Дашборд"],
      ["Мультиязычность",    "✗","Частично","✗","✓ RU/UZ/EN"],
    ];
    const rH = 0.55;
    rows.forEach((row,ri)=>{
      let rx = startX;
      row.forEach((cell,ci)=>{
        const bg = ci===4 ? (ri%2===0?EP:"F0FDF4") : (ri%2===0?W:S0);
        const isOk  = cell==="✓"||cell.startsWith("✓");
        const isBad = cell==="✗";
        s.addShape(pres.shapes.RECTANGLE,{x:rx,y:hY+hH+ri*rH,w:colW[ci],h:rH, fill:{color:bg}, line:{color:S2,width:1}});
        s.addText(cell,{x:rx+0.05,y:hY+hH+ri*rH,w:colW[ci]-0.1,h:rH,
          fontSize:12, color:isOk?EM:isBad?"EF4444":ci===0?S7:S5,
          bold:isOk||ci===0, align:"center", valign:"middle", fontFace:"Calibri"});
        rx+=colW[ci];
      });
    });
  }

  // ============================================================
  // SLIDE 9 — TECH STACK (dark slide)
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: "0F172A" }; // slate-900
    addRule(s); addNum(s, 9);
    addTitle(s, "Построено на современном стеке", W);
    addSub(s, "Масштабируемо с первого дня.", "6EE7B7");
    const techs = [
      { icon: iconBolt,   name:"Next.js 15", desc:"SSR, ISR, App Router.\nБыстро и SEO-ready.", accent:"1D4ED8" },
      { icon: iconShield, name:"Supabase",   desc:"PostgreSQL + RLS.\nБезопасность из коробки.", accent:EM },
      { icon: iconBolt,   name:"Real-time",  desc:"WebSocket-уведомления.\nМгновенная синхронизация.", accent:"7C3AED" },
      { icon: iconChart,  name:"Multi-lang", desc:"RU / UZ / EN.\nПолная i18n-интернационализация.", accent:"0891B2" },
      { icon: iconShield, name:"99.9% Uptime",desc:"Chunk Load Recovery.\nАвтоматическое восстановление.", accent:"D97706" },
    ];
    const tw=1.75, th=3.9;
    techs.forEach((t,i)=>{
      const x=0.28+i*(tw+0.19), y=1.3;
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:tw,h:th, fill:{color:"1E293B"}, line:{color:"334155",width:1},
        shadow:{type:"outer",blur:12,offset:4,angle:135,color:"000000",opacity:0.4}});
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:tw,h:0.07, fill:{color:t.accent}, line:{color:t.accent}});
      // Icon circle
      s.addShape(pres.shapes.OVAL,{x:x+(tw-0.85)/2,y:y+0.22,w:0.85,h:0.85, fill:{color:t.accent}, line:{color:t.accent}});
      s.addImage({ data: t.icon, x:x+(tw-0.85)/2+0.15, y:y+0.22+0.15, w:0.55, h:0.55 });
      s.addText(t.name,{x:x+0.08,y:y+1.2,w:tw-0.16,h:0.46, fontSize:13, color:W, bold:true, align:"center", fontFace:"Arial"});
      s.addText(t.desc,{x:x+0.08,y:y+1.7,w:tw-0.16,h:1.9,  fontSize:11, color:"94A3B8", align:"center", fontFace:"Calibri"});
    });
  }

  // ============================================================
  // SLIDE 10 — TEAM
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: W };
    addRule(s); addNum(s, 10);
    addTitle(s, "Люди за проектом");
    addSub(s, "Опыт в продукте, технологиях и социальных инициативах.");
    const members = [
      { initials:"ФИ", role:"Founder / CEO", skills:"Product vision\nBusiness dev\nStrategy", accent:E },
      { initials:"ФИ", role:"CTO",           skills:"Next.js · Supabase\nArchitecture · DevOps", accent:"3B82F6" },
      { initials:"ФИ", role:"Product Manager",skills:"UX Research\nGrowth · Analytics", accent:"8B5CF6" },
    ];
    const mw=2.85, mh=4.2;
    members.forEach((m,i)=>{
      const x=0.42+i*(mw+0.28), y=1.05;
      s.addShape(pres.shapes.RECTANGLE,{x,y,w:mw,h:mh, fill:{color:S0}, line:{color:S2}, shadow:makeShadow()});
      // Avatar
      s.addShape(pres.shapes.OVAL,{x:x+(mw-1.2)/2,y:y+0.3,w:1.2,h:1.2, fill:{color:m.accent}, line:{color:m.accent}});
      s.addText(m.initials,{x:x+(mw-1.2)/2,y:y+0.3,w:1.2,h:1.2, fontSize:26, color:W, bold:true, align:"center", valign:"middle", fontFace:"Arial Black"});
      s.addText("[Имя Фамилия]",{x:x+0.1,y:y+1.65,w:mw-0.2,h:0.45, fontSize:15, color:S9, bold:true, align:"center", fontFace:"Arial"});
      s.addText(m.role,{x:x+0.1,y:y+2.1,w:mw-0.2,h:0.38, fontSize:12, color:m.accent, bold:true, align:"center", fontFace:"Calibri"});
      s.addShape(pres.shapes.LINE,{x:x+0.35,y:y+2.55,w:mw-0.7,h:0, line:{color:S2,width:1}});
      s.addText(m.skills,{x:x+0.15,y:y+2.7,w:mw-0.3,h:1.3, fontSize:12, color:S7, align:"center", fontFace:"Calibri"});
    });
    // Advisors banner
    s.addShape(pres.shapes.RECTANGLE,{x:0.42,y:5.2,w:9.16,h:0.3, fill:{color:EP}, line:{color:EL}});
    s.addText("+ Advisors: [будут добавлены]   |   Открытые вакансии: Маркетинг · Продажи B2B",{
      x:0.42,y:5.2,w:9.16,h:0.3, fontSize:10.5, color:EM, align:"center", valign:"middle", fontFace:"Calibri"
    });
  }

  // ============================================================
  // SLIDE 11 — FINANCIALS
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: W };
    addRule(s); addNum(s, 11);
    addTitle(s, "Путь к устойчивости");
    addSub(s, "Консервативный прогноз. Break-even при 200+ Premium-подписчиках.");
    const kpis = [
      {label:"Burn Rate",  val:"$X,XXX/мес",   sub:"текущие расходы"},
      {label:"Runway",     val:"X месяцев",     sub:"при текущем финансировании"},
      {label:"Break-even", val:"Месяц X",       sub:"~200 Premium-подписчиков"},
    ];
    kpis.forEach((k,i)=>{
      const y=1.1+i*1.45;
      s.addShape(pres.shapes.RECTANGLE,{x:0.3,y,w:3.1,h:1.3, fill:{color:S0}, line:{color:S2}, shadow:makeShadow()});
      s.addShape(pres.shapes.RECTANGLE,{x:0.3,y,w:0.07,h:1.3, fill:{color:E}, line:{color:E}});
      s.addText(k.label,{x:0.5,y:y+0.08,w:2.8,h:0.3, fontSize:11, color:S5, fontFace:"Calibri"});
      s.addText(k.val,  {x:0.5,y:y+0.38,w:2.8,h:0.5, fontSize:20, color:S9, bold:true, fontFace:"Arial Black"});
      s.addText(k.sub,  {x:0.5,y:y+0.9, w:2.8,h:0.3, fontSize:10, color:S5, italic:true, fontFace:"Calibri"});
    });
    // Revenue chart
    s.addChart(pres.charts.BAR, [{
      name:"Выручка ($)",
      labels:["М6","М12","Год 2","Год 3"],
      values:[2000, 15000, 80000, 250000]
    }],{
      x:3.55,y:1.0,w:6.1,h:4.3, barDir:"col",
      chartColors:[E],
      chartArea:{ fill:{color:W}, roundedCorners:false },
      catAxisLabelColor:S5, valAxisLabelColor:S5,
      valGridLine:{color:S2, size:0.5}, catGridLine:{style:"none"},
      showValue:true, dataLabelColor:S7, dataLabelFontSize:11,
      showLegend:false, showTitle:true,
      title:"Revenue Projection ($)", titleFontSize:13, titleColor:S7,
    });
  }

  // ============================================================
  // SLIDE 12 — INVESTMENT ASK (dark)
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: ED };
    // Ambient glows
    [["-1.5","-0.5","5","5","89"],["7.5","3","4","4","91"]].forEach(([x,y,w,h,t])=>
      s.addShape(pres.shapes.OVAL,{x:+x,y:+y,w:+w,h:+h, fill:{color:E,transparency:+t}, line:{color:E,transparency:+t}})
    );
    addNum(s, 12);
    addTitle(s, "Инвестиции для масштабирования", W);
    addSub(s, "Инвестируйте не только в возврат — инвестируйте в наследие.", EG);
    // Ask box
    s.addShape(pres.shapes.RECTANGLE,{x:0.3,y:1.3,w:4.6,h:4.0, fill:{color:"0A2E23"}, line:{color:EM,width:1}});
    s.addText("Ищем",     {x:0.5,y:1.45,w:4.2,h:0.32, fontSize:13, color:EG, fontFace:"Calibri"});
    s.addText("$XXX,000", {x:0.5,y:1.75,w:4.2,h:0.72, fontSize:46, color:W, bold:true, fontFace:"Arial Black"});
    s.addShape(pres.shapes.LINE,{x:0.5,y:2.54,w:4.1,h:0, line:{color:EM,width:1}});
    s.addText("Pre-money оценка", {x:0.5,y:2.62,w:4.2,h:0.3, fontSize:11, color:EG, fontFace:"Calibri"});
    s.addText("$X,XXX,XXX",      {x:0.5,y:2.9, w:4.2,h:0.5, fontSize:24, color:W, bold:true, fontFace:"Arial Black"});
    s.addShape(pres.shapes.LINE,{x:0.5,y:3.47,w:4.1,h:0, line:{color:EM,width:1}});
    s.addText("Цель раунда",                    {x:0.5,y:3.55,w:4.2,h:0.3, fontSize:11, color:EG, fontFace:"Calibri"});
    s.addText("X,000 пользователей за 12 мес.", {x:0.5,y:3.82,w:4.2,h:0.46, fontSize:15, color:W, bold:true, fontFace:"Arial"});
    s.addShape(pres.shapes.LINE,{x:0.5,y:4.35,w:4.1,h:0, line:{color:EM,width:1}});
    s.addText("Инструмент: Pre-Seed  ·  SAFE / Equity", {x:0.5,y:4.42,w:4.2,h:0.72, fontSize:12, color:EG, fontFace:"Calibri"});
    // Pie chart
    s.addChart(pres.charts.PIE, [{
      name:"Распределение",
      labels:["Маркетинг и рост","Разработка","Команда","Операционные"],
      values:[40, 30, 20, 10]
    }],{
      x:5.1,y:1.2,w:4.6,h:4.15,
      chartColors:[E,"059669","34D399","6EE7B7"],
      chartArea:{ fill:{color:"064E3B"} },
      showPercent:true, dataLabelColor:W, dataLabelFontSize:12,
      legendFontColor:"D1FAE5", legendFontSize:11,
      showLegend:true, legendPos:"b",
      showTitle:true, title:"Использование средств",
      titleFontSize:13, titleColor:W,
    });
  }

  // ============================================================
  // SLIDE 13 — ROADMAP
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: W };
    addRule(s); addNum(s, 13);
    addTitle(s, "Куда мы идём");
    addSub(s, "Поэтапная экспансия с фокусом на продукт и рост.");
    // Timeline line
    const LY = 2.7;
    s.addShape(pres.shapes.LINE,{x:0.45,y:LY,w:9.1,h:0, line:{color:EL,width:3}});
    const milestones = [
      {q:"Q1 2026", title:"Запуск в\nТашкенте",      desc:"Первые 1,000\nпользователей"},
      {q:"Q2 2026", title:"Корпоративное\nволонтёрство", desc:"B2B-пакет\nдля компаний"},
      {q:"Q3 2026", title:"Мобильное\nприложение",    desc:"iOS + Android\nPush-уведомления"},
      {q:"Q4 2026", title:"Регионы\nУзбекистана",     desc:"Самарканд,\nБухара, Фергана"},
      {q:"2027",    title:"Экспансия\nв СНГ",          desc:"Казахстан,\nКыргызстан"},
    ];
    const n=milestones.length;
    milestones.forEach((m,i)=>{
      const mx = 0.45 + i*(9.1/(n-1));
      const isAbove = i%2===0;
      const cw=1.62, ch=1.5;
      const cx=Math.max(0.18,Math.min(mx-cw/2,8.2));
      const cy=isAbove ? LY-ch-0.55 : LY+0.55;
      // Dot
      s.addShape(pres.shapes.OVAL,{x:mx-0.18,y:LY-0.18,w:0.36,h:0.36, fill:{color:E}, line:{color:ED,width:2}});
      // Connector
      if(isAbove)
        s.addShape(pres.shapes.LINE,{x:mx,y:cy+ch,w:0,h:LY-cy-ch, line:{color:EL,width:1,dashType:"dash"}});
      else
        s.addShape(pres.shapes.LINE,{x:mx,y:LY+0.18,w:0,h:cy-LY-0.18, line:{color:EL,width:1,dashType:"dash"}});
      // Card
      s.addShape(pres.shapes.RECTANGLE,{x:cx,y:cy,w:cw,h:ch, fill:{color:S0}, line:{color:S2}, shadow:makeShadow()});
      s.addShape(pres.shapes.RECTANGLE,{x:cx,y:cy,w:cw,h:0.07, fill:{color:E}, line:{color:E}});
      s.addText(m.q,    {x:cx+0.09,y:cy+0.1, w:cw-0.18,h:0.3,  fontSize:9.5, color:E, bold:true, fontFace:"Arial"});
      s.addText(m.title,{x:cx+0.09,y:cy+0.38,w:cw-0.18,h:0.48, fontSize:11,  color:S9, bold:true, fontFace:"Arial"});
      s.addText(m.desc, {x:cx+0.09,y:cy+0.86,w:cw-0.18,h:0.52, fontSize:10,  color:S7, fontFace:"Calibri"});
    });
  }

  // ============================================================
  // SLIDE 14 — FINAL CTA (dark)
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: ED };
    // Glows
    [["-1.5","2","5","5","87"],["7.5","-0.5","4","4","90"],["4","3.8","3","3","93"]].forEach(([x,y,w,h,t])=>
      s.addShape(pres.shapes.OVAL,{x:+x,y:+y,w:+w,h:+h, fill:{color:E,transparency:+t}, line:{color:E,transparency:+t}})
    );
    // Logo
    s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:4.0,y:0.42,w:2.0,h:2.0, rectRadius:0.28,
      fill:{color:E}, line:{color:E},
      shadow:{type:"outer",blur:24,offset:8,angle:135,color:"000000",opacity:0.45}});
    s.addImage({ data: iconHeart, x:4.35, y:0.78, w:1.3, h:1.3 });
    s.addText("Давайте менять мир вместе", {
      x:0.5, y:2.55, w:9, h:0.72,
      fontSize:32, color:W, bold:true, align:"center", fontFace:"Arial Black"
    });
    s.addText('"Каждый хочет быть героем. Мы даём им эту возможность."', {
      x:1, y:3.28, w:8, h:0.42,
      fontSize:14, color:EG, italic:true, align:"center", fontFace:"Calibri"
    });
    // Contact cards
    const contacts = [
      {icon:"✉",  label:"Email",  val:"email@volohero.uz"},
      {icon:"🌐", label:"Сайт",   val:"volohero.uz"},
      {icon:"📱", label:"Соцсети",val:"@volohero"},
      {icon:"🎯", label:"Демо",   val:"demo.volohero.uz"},
    ];
    const ccw=2.08, cch=0.92;
    contacts.forEach((c,i)=>{
      const x=0.46+i*(ccw+0.2);
      s.addShape(pres.shapes.RECTANGLE,{x,y:3.9,w:ccw,h:cch, fill:{color:"0A2E23"}, line:{color:EM,width:1}});
      s.addText(c.icon+"  "+c.label, {x:x+0.12,y:3.98,w:ccw-0.24,h:0.28, fontSize:9.5, color:EG, bold:true, fontFace:"Calibri"});
      s.addText(c.val, {x:x+0.12,y:4.28,w:ccw-0.24,h:0.42, fontSize:13, color:W, bold:true, fontFace:"Calibri"});
    });
    s.addText("VoloHero  ·  Первая специализированная платформа волонтёрства в Центральной Азии  ·  2025", {
      x:0, y:5.2, w:10, h:0.3,
      fontSize:9.5, color:"4ADE80", align:"center", fontFace:"Calibri"
    });
  }

  // === WRITE ===
  const outPath = "VoloHero_PitchDeck_2025.pptx";
  await pres.writeFile({ fileName: outPath });
  console.log("✅  Done:", outPath);
}

createPresentation().catch(err => { console.error("❌", err); process.exit(1); });
