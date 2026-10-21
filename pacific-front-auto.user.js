// ==UserScript==
// @name         Pacific Front 自动排阵与游玩 (四阶双拼攻坚与煤炭战略确权版)
// @namespace    local.pacific-front
// @version      2.6.0
// @description  大洋战线阶段最优规划；四阶SOP双插槽合体攻坚、煤炭战略资源95%确权、无损去冗杜绝绿道具滥用、全图鉴九阶防溢出升序枚举、单槽独立精算。
// @match        https://pacificfront.worldofwarships.asia/*
// @match        https://pacificfront.worldofwarships.eu/*
// @match        https://pacificfront.worldofwarships.com/*
// @match        https://oceanfront.wowsgame.cn/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function (root) {
  'use strict';
  const SCRIPT_VERSION = '2.6.0';
  const VERSION = 'ad60d10b';
  const ALLOWED_ORIGINS = Object.freeze([
    'https://pacificfront.worldofwarships.asia',
    'https://pacificfront.worldofwarships.eu',
    'https://pacificfront.worldofwarships.com',
    'https://oceanfront.wowsgame.cn'
  ]);

  function routeInfo(pathname) {
    const match = pathname.match(/^\/(?:(?<lang>[a-z]{2}(?:-[a-z0-9]{2,8})*)\/)?operations(?:\/(?<op>[^/]+)(?:\/(?<kp>[^/]+))?)?\/?$/i);
    if (!match) return { prefix: '', operationId: null, keypointId: null };
    try {
      return {
        prefix: match.groups.lang ? '/' + match.groups.lang : '',
        operationId: match.groups.op ? decodeURIComponent(match.groups.op) : null,
        keypointId: match.groups.kp ? decodeURIComponent(match.groups.kp) : null
      };
    } catch {
      throw Error('页面行动地址的编码无效，请重新打开行动页面。');
    }
  }

  function operationPath(pathname, operationId, keypointId) {
    return routeInfo(pathname).prefix + '/operations' + (operationId ? '/' + encodeURIComponent(operationId) : '') +
      (keypointId ? '/' + encodeURIComponent(keypointId) : '');
  }

  const defaults = Object.freeze({
    minSelectionWinRate: 0.80, minWinRate: 0.90, targetWinRate: 1, maxBattles: 30, delayMs: 1000,
    searchRestarts: 6, searchPasses: 3, maxPredictions: 12000, syncPage: true,
    fillAllSlots: true, useModifiers: true, autoBuy: false,
    minModifierGain: 0, maxModifiersPerBattle: Infinity, maxModifierPredictions: 12000,
    modifierBeamWidth: 16, maxJointPredictions: 60000, maxSearchMs: 4000, unlimitedHardSearch: true,
    preferNoModifiers: true, returnToMenu: true,
    fullClearStage: true
  });

  const BILINGUAL_SHIPS = {
    "地狱俯冲者": '“地狱俯冲者”俯冲轰炸机 埃塞克斯 / SB2C Helldiver (Essex)',
    "helldiver": '“地狱俯冲者”俯冲轰炸机 埃塞克斯 / SB2C Helldiver (Essex)',
    "f4u": 'F4U战斗机 埃塞克斯 / F4U Corsair (Essex)',
    "corsair": 'F4U战斗机 埃塞克斯 / F4U Corsair (Essex)',
    "密苏里": '密苏里 / Missouri',
    "missouri": '密苏里 / Missouri',
    "北卡罗来纳": '北卡罗来纳 / North Carolina',
    "north_carolina": '北卡罗来纳 / North Carolina',
    "阿拉斯加": '阿拉斯加 / Alaska',
    "alaska": '阿拉斯加 / Alaska',
    "巴尔的摩": '巴尔的摩 / Baltimore',
    "baltimore": '巴尔的摩 / Baltimore',
    "拉菲": '拉菲 / Laffey',
    "laffey": '拉菲 / Laffey',
    "约翰斯顿": '约翰斯顿 / Johnston',
    "johnston": '约翰斯顿 / Johnston',
    "复仇者": '“复仇者”鱼雷轰炸机 企业 / TBF Avenger (Enterprise)',
    "avenger": '“复仇者”鱼雷轰炸机 企业 / TBF Avenger (Enterprise)',
    "地狱猫": '“地狱猫”战斗机 企业 / F6F Hellcat (Enterprise)',
    "hellcat": '“地狱猫”战斗机 企业 / F6F Hellcat (Enterprise)',
    "英王乔治五世": '英王乔治五世 / King George V',
    "king_george": '英王乔治五世 / King George V',
    "科罗拉多": '科罗拉多 / Colorado',
    "colorado": '科罗拉多 / Colorado',
    "克利夫兰": '克利夫兰 / Cleveland',
    "cleveland": '克利夫兰 / Cleveland',
    "圣地亚哥": '圣地亚哥 / San Diego',
    "san_diego": '圣地亚哥 / San Diego',
    "新奥尔良": '新奥尔良 / New Orleans',
    "new_orleans": '新奥尔良 / New Orleans',
    "基德": '基德 / Kidd',
    "kidd": '基德 / Kidd',
    "本森": '本森 / Benson',
    "benson": '本森 / Benson',
    "凯旋": '凯旋 / Le Triomphant',
    "triomphant": '凯旋 / Le Triomphant',
    "反击": '反击 / Repulse',
    "repulse": '反击 / Repulse',
    "新墨西哥": '新墨西哥 / New Mexico',
    "new_mexico": '新墨西哥 / New Mexico',
    "无畏式": '“无畏式”俯冲轰炸机 萨拉托加 / SBD Dauntless (Saratoga)',
    "dauntless": '“无畏式”俯冲轰炸机 萨拉托加 / SBD Dauntless (Saratoga)',
    "休斯": '休斯 / Hughes',
    "hughes": '休斯 / Hughes',
    "野猫": '“野猫”战斗机 萨拉托加 / F4F Wildcat (Saratoga)',
    "wildcat": '“野猫”战斗机 萨拉托加 / F4F Wildcat (Saratoga)',
    "霍巴特": '霍巴特 / Hobart',
    "hobart": '霍巴特 / Hobart',
    "马布尔黑德": '马布尔黑德 / Marblehead',
    "marblehead": '马布尔黑德 / Marblehead',
    "德·鲁伊特": '德·鲁伊特 / De Ruyter',
    "德.鲁伊特": '德·鲁伊特 / De Ruyter',
    "de_ruyter": '德·鲁伊特 / De Ruyter',
    "法拉格特": '法拉格特 / Farragut',
    "farragut": '法拉格特 / Farragut',
    "箭": '箭 / Arrow',
    "arrow": '箭 / Arrow',
    "约翰·d·福特": '约翰·D·福特 / John D. Ford',
    "约翰.d.福特": '约翰·D·福特 / John D. Ford',
    "ford": '约翰·D·福特 / John D. Ford',
    "吸血鬼": '吸血鬼 / Vampire',
    "vampire": '吸血鬼 / Vampire'
  };

  const BILINGUAL_MODS = {
    gunnery: '炮术训练 / Gunnery Training',
    artillery: '炮术训练 / Gunnery Training',
    attack: '炮术训练 / Gunnery Training',
    damage_control: '损管训练 / Damage Control Training',
    defense: '损管训练 / Damage Control Training',
    helmsman: '舵手训练 / Helmsman Training',
    rudder: '舵手训练 / Helmsman Training',
    teamwork: '团队协作 / Teamwork',
    cooperation: '团队协作 / Teamwork',
    token: '效率 / Progress Booster',
    effectiveness: '效率 / Progress Booster',
    efficiency: '效率 / Progress Booster',
    morale: '士气打击 / Morale Impact',
    moral: '士气打击 / Morale Impact',
    focus: '专注 / Focus',
    focused: '专注 / Focus',
    specialization: '专精 / Specialization',
    specialty: '专精 / Specialization',
    old_salt: '老水手 / Old Salt',
    veteran: '老水手 / Veteran Sailor',
    repair: '快速维修 / Quick Repair',
    unstoppable: '势不可挡 / Unstoppable',
    relentless: '势不可挡 / Relentless'
  };

  function formatCardName(c) {
    if (!c) return '空位 / Empty';
    const realName = String(c.title ?? c.name ?? '').trim();
    const code = String(c.code ?? '').toLowerCase();
    const lowName = realName.toLowerCase();
    for (const [key, val] of Object.entries(BILINGUAL_SHIPS)) {
      if (code.includes(key) || lowName.includes(key) || realName.includes(key)) return val;
    }
    return realName ? `${realName} (${c.code})` : c.code;
  }

  function formatModifierName(id) {
    if (!id) return '';
    const low = String(id).toLowerCase();
    for (const [key, val] of Object.entries(BILINGUAL_MODS)) {
      if (low.includes(key)) return val;
    }
    return id;
  }

  // --- 【30/30 盟军全舰艇：白/蓝/黄九阶绝对硬分档】 ---
  function getCardColor(c) {
    if (!c) return { label: '空位', tierGroup: 'none', weight: 0, rank: 0 };
    const p = power(c);

    if (p >= 195) return { label: '高级黄/Adv Yellow (190-210+)', tierGroup: 'adv_yellow', weight: 800, rank: 9 };
    if (p >= 185) return { label: '中级黄/Mid Yellow (180-200)', tierGroup: 'mid_yellow', weight: 500, rank: 8 };
    if (p >= 168) return { label: '基础黄/Base Yellow (170-190)', tierGroup: 'base_yellow', weight: 300, rank: 7 };

    if (p >= 152) return { label: '高级蓝/Adv Blue (145-165)', tierGroup: 'adv_blue', weight: 80, rank: 6 };
    if (p >= 142) return { label: '中级蓝/Mid Blue (135-155/140-160)', tierGroup: 'mid_blue', weight: 50, rank: 5 };
    if (p >= 128) return { label: '基础蓝/Base Blue (130-150)', tierGroup: 'base_blue', weight: 30, rank: 4 };

    if (p >= 110) return { label: '高级白/Adv White (105-125)', tierGroup: 'adv_white', weight: 6, rank: 3 };
    if (p >= 102) return { label: '中级白/Mid White (95-115)', tierGroup: 'mid_white', weight: 3, rank: 2 };
    return { label: '基础白/Base White (90-110)', tierGroup: 'base_white', weight: 1, rank: 1 };
  }

  function calcSingleCardCost(c) {
    if (!c) return 0;
    return getCardColor(c).weight * 1000 + power(c);
  }

  const finished = k => ['cleared', 'missed'].includes(k.status);
  const slots = k => Array.from({ length: 4 }, (_, i) => k.slots?.[String(i)] ?? null);
  const power = c => Object.values(c?.specs ?? {}).reduce((a, b) => a + b, 0);

  const isCommonBoss = e => e?.tags?.some(t => t === 'common_boss');
  const isEpicBoss = e => e?.tags?.some(t => t === 'epic_boss');

  function isFinalTokenBossNode(op, kp) {
    const stage = activeStage(op);
    if (!stage) return false;
    const stages = op.stages ?? [];
    const isLastStage = stages.length > 0 && stages[stages.length - 1]?.id === stage.id;
    return isLastStage && slots(kp).some(s => isEpicBoss(s?.enemy) || String(s?.enemy?.code).includes('boss'));
  }

  function getKeypointThreat(kp) {
    if (Number.isFinite(kp.stars) && kp.stars > 0) return kp.stars * 1000;
    const diff = String(kp.difficulty ?? '').toLowerCase();
    if (diff === 'hard' || diff.includes('困') || diff === '3') return 3000;
    if (diff === 'normal' || diff === 'medium' || diff.includes('中') || diff === '2') return 2000;
    if (diff === 'easy' || diff.includes('简') || diff === '1') return 1000;
    return slots(kp).reduce((sum, s) => sum + (s?.enemy ? power(s.enemy) : 0), 0);
  }

  function parseSlotReward(slot) {
    if (!slot) return { type: 'unknown', amount: 0, label: '无目标', isRepairDrop: false, isTokenDrop: false };

    const rewardData = slot.reward ?? slot.rewards ?? slot.drop ?? slot.drops ??
      (() => { const c = { ...slot }; delete c.enemy; delete c.ally; return c; })();

    const jsonStr = JSON.stringify(rewardData).toLowerCase();
    const amtMatch = jsonStr.match(/(?:amount|count|value|total|quantity)["':\s]+(\d+)/);
    const amt = Number(amtMatch?.[1] ?? 0);

    // 1. 快速维修包
    if (jsonStr.includes('repair') || jsonStr.includes('维修') || jsonStr.includes('wrench')) {
      return { type: 'repair', amount: amt || 2, label: '🔧快速维修包', isRepairDrop: true, isTokenDrop: false };
    }

    // 2. 煤炭 (战略硬通货)
    if (jsonStr.includes('coal') || jsonStr.includes('煤炭')) {
      return { type: 'coal', amount: amt, label: `💎${amt || ''}煤炭`, isRepairDrop: false, isTokenDrop: false };
    }

    // 3. 经验家族
    if (jsonStr.includes('xp') || jsonStr.includes('exp') || jsonStr.includes('commander') ||
        jsonStr.includes('crew') || jsonStr.includes('elite') || jsonStr.includes('经验')) {
      const isCommander = jsonStr.includes('commander') || jsonStr.includes('crew') || jsonStr.includes('elite') || jsonStr.includes('指挥官');
      const labelText = isCommander ? `⭐${amt || ''}精英指挥官经验` : `⭐${amt || ''}全局经验`;
      return { type: 'exp', amount: amt, label: labelText, isRepairDrop: false, isTokenDrop: false };
    }

    // 4. 银币 (credits / silver)
    if (jsonStr.includes('credits') || jsonStr.includes('silver') || jsonStr.includes('银币')) {
      return { type: 'silver', amount: amt, label: `🪙${amt || ''}银币`, isRepairDrop: false, isTokenDrop: false };
    }

    // 5. 简章 / 图纸 / 蓝图
    if (jsonStr.includes('blueprint') || jsonStr.includes('图纸') || jsonStr.includes('简章') || jsonStr.includes('drawing')) {
      return { type: 'blueprint', amount: amt, label: `📘${amt || ''}简章图纸`, isRepairDrop: false, isTokenDrop: false };
    }

    // 6. 特殊修改器
    if (jsonStr.includes('modifier') || jsonStr.includes('item') || jsonStr.includes('ticket')) {
      return { type: 'item', amount: 1, label: '⚔️特殊修改器', isRepairDrop: false, isTokenDrop: false };
    }

    // 7. 进度代币 (数额 >= 100)
    if (amt >= 100) {
      return { type: 'token', amount: amt, label: `👑${amt}进度代币`, isRepairDrop: false, isTokenDrop: true };
    }

    return { type: 'supply', amount: amt || 1, label: `⚓${amt || ''}舰队补给`, isRepairDrop: false, isTokenDrop: false };
  }

  function getSlotTargetRate(slot) {
    const enemy = slot?.enemy;
    if (!enemy) return 0;
    const rewardInfo = parseSlotReward(slot);
    const p = power(enemy);

    const isRed = isEpicBoss(enemy) || enemy.tier >= 4 || p >= 220;
    const isYellow = !isRed && (isCommonBoss(enemy) || enemy.tier === 3 || p >= 150);

    if (rewardInfo.type === 'token') return 1.0;
    if (rewardInfo.isRepairDrop || rewardInfo.type === 'coal') return 0.95; // 修船包与煤炭 95% 绝不翻车
    if (isRed) return 1.0;
    if (isYellow) return 0.90;
    if (rewardInfo.type === 'blueprint' || rewardInfo.type === 'item') return 0.85;
    if (rewardInfo.type === 'silver' || rewardInfo.type === 'exp') return 0.85;
    return 0.80;
  }

  const stageDone = s => s.condition?.type === 'defeat_vehicles'
    ? s.condition.total >= s.condition.target : s.isFinished === true;
  const activeStage = op => op.stages?.find(s => s.isActive) ?? (!op.isStarted ? op.stages?.[0] : null);

  function unwrapResponse(data, path) {
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    if (!object(data) || !Object.prototype.hasOwnProperty.call(data, 'result') ||
        !object(data.result) || (typeof data.status === 'string' && data.status !== 'ok')) {
      const shape = object(data) ? Object.keys(data).slice(0, 12).join(', ') :
        data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data;
      throw Error(`接口响应格式异常 (${path})：[${shape}]`);
    }
    return data.result;
  }

  const usedCards = stage => new Set((stage.keypoints ?? []).filter(k => k.status === 'cleared')
    .flatMap(k => slots(k).map(s => s?.ally?.code).filter(Boolean)));

  function effectPayloads(op, kp, threshold) {
    const stages = op.stages;
    const index = stages.findIndex(s => s.keypoints?.some(k => k.id === kp.id));
    return (op.effects ?? []).filter(e => {
      if (!e.payload || e.payload.delta_disabled) return false;
      const sourceIndex = stages.findIndex(s => s.keypoints?.some(k => k.id === e.source));
      if (!e.applyTo?.includes(kp.id) && !(e.isSubsequent && e.source !== kp.id &&
          sourceIndex >= 0 && sourceIndex < index)) return false;
      const mitigable = e.isMitigable && ![5, 6].includes(e.payload.type);
      if (!mitigable && e.source) {
        const source = stages.flatMap(s => s.keypoints ?? []).find(k => k.id === e.source);
        if (source?.status === 'cleared') {
          const ss = Object.values(source.slots ?? {});
          const wins = ss.reduce((n, s) => n + (s.outcome === 'win'
            ? 1 + Number(s.ally?.modifiers?.includes('moral-impact') ?? false) : 0), 0);
          if (ss.length && Math.min(wins / ss.length, 1) >= threshold) return false;
        }
      }
      return true;
    }).map(e => e.payload);
  }

  function availableCards(catalog, inventory, stage, effects, excludedCodes = new Set()) {
    if (!Array.isArray(inventory.cards)) throw Error('库存格式已变化：没有 cards 数组。');
    const used = usedCards(stage);
    const restrictions = effects.filter(e => e.type === 6).map(e => e.restrictions ?? {});
    const byCode = new Map(catalog.map(c => [c.code, c]));
    return inventory.cards.filter(c => c.health > 0 && !used.has(c.code) && !excludedCodes.has(c.code)).map(item => {
      const card = byCode.get(item.code);
      if (!card) throw Error('未知卡牌：' + item.code);
      return { ...card, health: item.health };
    }).filter(c => !restrictions.some(r => r.cards?.includes(c.code) || r.types?.includes(c.type) ||
      r.tier?.includes(c.tier)));
  }

  function makeEffect(engine, p) {
    const restriction = r => r ? engine.newRestriction(r.cards ?? [], r.types ?? [],
      r.tier ?? [], r.modifiers ?? [], false) : engine.newEmptyRestriction();
    const r = restriction(p.apply_restrictions);
    switch (p.type) {
      case 1: return engine.newMultiplyPlayerSpecsEffect(p.specs ?? {}, p.delta_specs ?? {}, r);
      case 2: return engine.newMultiplyPlayerBuffsEffect(p.multiplier, p.delta_multiplier ?? 0, r);
      case 3: return engine.newMultiplyPlayerDebuffsEffect(p.multiplier, p.delta_multiplier ?? 0, r);
      case 4: return engine.newMultiplyEnemyPowerEffect(p.specs ?? {}, p.delta_specs ?? {}, r);
      case 5: return engine.newDisableAllModifiersEffect(false);
      case 6: return engine.newExtraRestrictionsEffect(restriction(p.restrictions), false);
      default: throw Error('尚未支持的战斗条件：' + p.type);
    }
  }

  function createPredictor(engine, settings, kp, effects) {
    const enemies = slots(kp).map(slot => slot?.enemy ? engine.newCard(slot.enemy.code,
      slot.enemy.type, slot.enemy.tier, slot.enemy.specs ?? {}, slot.enemy.vulns ?? {}, [], engine.newFullHealth()) : null);
    const preparedEffects = effects.map(p => makeEffect(engine, p));
    const cardCache = new WeakMap();
    return (cards, modifiers = [[], [], [], []]) => {
      const board = engine.newBoard(4);
      enemies.forEach((enemy, i) => {
        if (enemy) board.Enemy.Slots[i] = engine.newSlot(enemy);
        const c = cards[i];
        if (c) {
          let prepared = cardCache.get(c);
          if (!prepared) {
            const buffs = [];
            for (const b of c.buffs ?? []) {
              const effect = engine.newEffect(0, true);
              effect.Relative = { [b.spec]: b.value };
              buffs.push(engine.newBuff(b.direction, effect));
            }
            for (const b of c.debuffs ?? []) {
              const effect = engine.newEffect(b.vuln, false);
              effect.Relative = { 0: b.value };
              buffs.push(engine.newBuff(b.direction, effect));
            }
            prepared = engine.newCard(c.code, c.type, c.tier, c.specs ?? {}, {}, buffs, engine.newHealth(c.health, 3));
            cardCache.set(c, prepared);
          }
          board.Player.Slots[i] = engine.newSlot(prepared, ...(modifiers[i] ?? []));
        }
      });
      if (preparedEffects.length) board.Effects = preparedEffects;
      const [ok, error, result] = engine.predict(board, settings);
      if (!ok || error || !result) throw Error('页面预测引擎失败：' + String(error ?? '无结果'));
      const rates = Array.from(result.Predictions);
      return rates.map(p => p / 100);
    };
  }

  function modifierCounts(inventory) {
    return new Map((inventory.modifiers ?? []).map(m => [m.id, m.amount ?? 0]));
  }
  function expectedWins(kp, cards, rates) {
    return rates.reduce((n, p, i) => n + (cards[i] && slots(kp)[i]?.enemy ? p : 0), 0);
  }

  function planMetricsWithTargets(kp, cards, rates, config) {
    const kpSlots = slots(kp);
    const targetRates = kpSlots.map(s => s?.enemy ? getSlotTargetRate(s) : 0);

    let deficit = 0, covered = 0, totalEnemies = 0;
    let zeroSlotCount = 0;

    kpSlots.forEach((s, i) => {
      if (s?.enemy) {
        totalEnemies++;
        const actualRate = cards[i] ? rates[i] : 0;
        const target = targetRates[i];
        if (actualRate >= target - 1e-4) {
          covered++;
        } else {
          deficit += (target - actualRate);
          if (actualRate < 0.25) zeroSlotCount++;
        }
      }
    });

    const safe = totalEnemies > 0 && deficit <= 1e-4;
    return {
      safe, selectionSafe: safe,
      battleCovered: covered,
      battleDeficit: deficit + zeroSlotCount * 25,
      zeroSlotCount,
      targetRates,
      weakestRate: Math.min(1, ...kpSlots.flatMap((s, i) => s?.enemy ? [cards[i] ? rates[i] : 0] : []))
    };
  }

  function getModInfo(mId, collectionModifiers) {
    const mod = (collectionModifiers ?? []).find(m => m.id === mId);
    const text = `${mod?.id ?? ''} ${mod?.name ?? ''} ${mod?.description ?? ''} ${(mod?.tags ?? []).join(' ')}`.toLowerCase();
    const isWhite = Boolean(mod?.price);

    const isToken = text.includes('token') || text.includes('progress') || text.includes('代币') ||
                    text.includes('进度') || text.includes('effectiveness') || text.includes('efficiency') ||
                    text.includes('效率') || JSON.stringify(mod?.price ?? '').includes('18');

    const isTeamwork = text.includes('teamwork') || text.includes('cooperation') || text.includes('团队协作');
    const isMorale = text.includes('moral') || text.includes('士气');
    const isRepair = text.includes('repair') || text.includes('维修') || text.includes('恢复') || text.includes('wrench');
    const isUnstoppable = text.includes('unstoppable') || text.includes('relentless') || text.includes('势不可挡');
    const isFocus = text.includes('focus') || text.includes('专注');
    const isSpec = text.includes('specializ') || text.includes('专精');
    const isOldSalt = text.includes('old_salt') || text.includes('veteran') || text.includes('sailor') || text.includes('老水手');

    const isBaseWhiteCombat = isWhite && !isToken && !isMorale && !isRepair && !isTeamwork;
    const isGreenSpecial = !isWhite && (isRepair || isUnstoppable || isFocus || isSpec || isOldSalt);

    return { mod, isWhite, isToken, isMorale, isTeamwork, isRepair, isUnstoppable, isFocus, isSpec, isOldSalt, isBaseWhiteCombat, isGreenSpecial };
  }

  function findTokenBooster(collectionModifiers) {
    return (collectionModifiers ?? []).find(m => getModInfo(m.id, collectionModifiers).isToken && m.price) ?? null;
  }

  function slotReceivesIncomingBuff(cards, slotIdx) {
    if (slotIdx > 0 && cards[slotIdx - 1]) {
      const leftCard = cards[slotIdx - 1];
      const hasRightBuff = (leftCard.buffs ?? []).some(b => {
        const d = String(b.direction).toLowerCase();
        return d === 'right' || d === '1' || d === 'east' || d === 'r';
      });
      if (hasRightBuff) return true;
    }
    if (slotIdx < 3 && cards[slotIdx + 1]) {
      const rightCard = cards[slotIdx + 1];
      const hasLeftBuff = (rightCard.buffs ?? []).some(b => {
        const d = String(b.direction).toLowerCase();
        return d === 'left' || d === '3' || d === 'west' || d === 'l';
      });
      if (hasLeftBuff) return true;
    }
    return false;
  }

  function comparePlans(a, b, config, context) {
    const { isFinalBoss, maxYMaxAllowed } = context;

    if (a.zeroSlotCount !== b.zeroSlotCount) {
      return a.zeroSlotCount - b.zeroSlotCount;
    }

    if (!isFinalBoss && Number.isFinite(maxYMaxAllowed)) {
      const aYellow = a.cards.filter(c => c && getCardColor(c).rank >= 7).length;
      const bYellow = b.cards.filter(c => c && getCardColor(c).rank >= 7).length;
      const aOver = aYellow > maxYMaxAllowed;
      const bOver = bYellow > maxYMaxAllowed;
      if (aOver !== bOver) return aOver ? 1 : -1;
    }

    const safeDiff = Number(b.safe) - Number(a.safe);
    if (safeDiff !== 0) return safeDiff;

    if (config.fillAllSlots) {
      const slotDiff = b.cards.filter(Boolean).length - a.cards.filter(Boolean).length;
      if (slotDiff !== 0) return slotDiff;
    }

    const aMods = a.modifiers?.flat().length ?? 0;
    const bMods = b.modifiers?.flat().length ?? 0;

    const calcModTierCost = plan => {
      let cost = 0;
      for (const mList of plan.modifiers ?? []) {
        for (const mId of mList) {
          const info = getModInfo(mId, context.collectionMods);
          if (info.isToken) cost += 1000;
          else if (info.isBaseWhiteCombat || info.isTeamwork) cost += 2000;
          else if (info.isGreenSpecial) cost += 10000;
        }
      }
      return cost;
    };
    const costDiff = calcModTierCost(a) - calcModTierCost(b);

    if (a.safe && b.safe) {
      if (aMods !== bMods) return aMods - bMods;
      if (Math.abs(costDiff) > 0.1) return costDiff;

      if (context.stock && aMods > 0) {
        const getStockSum = plan => (plan.modifiers ?? []).flat().reduce((s, id) => s + (context.stock.get(id) ?? 0), 0);
        const stockDiff = getStockSum(b) - getStockSum(a);
        if (stockDiff !== 0) return stockDiff;
      }

      const cardCostA = a.cards.reduce((sum, c) => sum + calcSingleCardCost(c), 0);
      const cardCostB = b.cards.reduce((sum, c) => sum + calcSingleCardCost(c), 0);
      if (Math.abs(cardCostA - cardCostB) > 0.1) return cardCostA - cardCostB;

      const rateDiff = (b.weakestRate ?? 0) - (a.weakestRate ?? 0);
      if (Math.abs(rateDiff) > 0.001) return rateDiff;
    }

    // 未完全达标状态下：同等缺口下道具越少越优，杜绝滥用
    const defDiff = a.battleDeficit - b.battleDeficit;
    if (Math.abs(defDiff) > 0.05) return defDiff;
    if (aMods !== bMods) return aMods - bMods;
    if (Math.abs(costDiff) > 0.1) return costDiff;

    return b.expected - a.expected || (b.weakestRate ?? 0) - (a.weakestRate ?? 0) || b.score - a.score;
  }

  // --- 【搜索引擎：支持 Stage 4 dual 双插槽合体】 ---
  async function optimizeJoint(engine, settings, kp, candidates, effects, inventory, config,
      checkpoint, yieldUI, seedPlans = [], rateCache = new Map(), onProgress = () => {}, context = {}) {
    const { isFinalBoss, searchMode } = context; // 'bare' | 'white' | 'green' | 'dual'
    const now = () => typeof performance === 'object' ? performance.now() : Date.now();
    const startedAt = now(), deadline = startedAt + (config.maxSearchMs ?? 4000);
    checkpoint();
    const core = { ...engine.newSettings(), ...settings.options.defaultCoreSettings };
    const attrs = engine.getModifiers?.() ?? {};
    const stock = modifierCounts(inventory);
    context.stock = stock;
    const disabled = !config.useModifiers || effects.some(e => e.type === 5);
    const restricted = new Set(effects.filter(e => e.type === 6).flatMap(e => e.restrictions?.modifiers ?? []));

    const pool = [...candidates].sort((a, b) => {
      const rankA = getCardColor(a).rank, rankB = getCardColor(b).rank;
      if (rankA !== rankB) return rankA - rankB;
      return power(a) - power(b);
    });

    const byCode = new Map(pool.map(c => [c.code, c]));
    const cache = new Map(), lineups = new Set();
    let best = null, predictions = 0, firstError = '';
    const limit = config.maxJointPredictions ?? 60000;
    const preparedPredict = createPredictor(engine, core, kp, effects);
    let cacheHits = 0;
    const emptyMods = () => [[], [], [], []];

    function getSlotModifierAllocations(cards, slotIdx) {
      if (disabled) return [[]];
      const card = cards[slotIdx];
      if (!card) return [[]];

      const slotObj = slots(kp)[slotIdx];
      const reward = parseSlotReward(slotObj);

      // 代币槽位：基准是 [效率]，白插槽锁定，不足时绿插槽挂绿增益
      if (reward.type === 'token') {
        const booster = findTokenBooster(settings.collection.modifiers);
        const boosterId = booster?.id;
        const hasBooster = boosterId && (stock.get(boosterId) ?? 0) > 0;
        const baseAlloc = hasBooster ? [boosterId] : [];

        if (searchMode === 'bare' || searchMode === 'white' || !hasBooster) {
          return [baseAlloc];
        }

        const greenMods = [...stock]
          .filter(([id, count]) => count > 0 && !restricted.has(id) && attrs[id]?.Type === 2 && getModInfo(id, settings.collection.modifiers).isGreenSpecial)
          .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
          .map(([id]) => id);

        return [baseAlloc, ...greenMods.map(gId => [...baseAlloc, gId])];
      }

      // 非代币槽位 (煤炭、修船、常规敌人)
      if (searchMode === 'bare') return [[]];

      const receivesBuff = slotReceivesIncomingBuff(cards, slotIdx);

      const whiteMods = [...stock]
        .filter(([id, count]) => {
          if (count <= 0 || restricted.has(id) || attrs[id]?.Type !== 1) return false;
          const info = getModInfo(id, settings.collection.modifiers);
          if (info.isToken || info.isMorale) return false;
          if (info.isBaseWhiteCombat) return true;
          if (info.isTeamwork) return receivesBuff;
          return false;
        })
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .map(([id]) => id);

      if (searchMode === 'white') {
        return [[], ...whiteMods.map(wId => [wId])];
      }

      const greenMods = [...stock]
        .filter(([id, count]) => {
          if (count <= 0 || restricted.has(id) || attrs[id]?.Type !== 2) return false;
          const info = getModInfo(id, settings.collection.modifiers);
          if (!info.isGreenSpecial) return false;
          if (info.isRepair && card.health >= 3) return false;
          return true;
        })
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .map(([id]) => id);

      if (searchMode === 'green') {
        return [[], ...whiteMods.map(wId => [wId]), ...greenMods.map(gId => [gId])];
      }

      // searchMode === 'dual': 四阶合体攻坚 (1白 + 1绿双拼)
      const dualAllocs = [];
      for (const wId of whiteMods.slice(0, 2)) {
        for (const gId of greenMods.slice(0, 3)) {
          dualAllocs.push([wId, gId]);
        }
      }

      return [[], ...whiteMods.map(wId => [wId]), ...greenMods.map(gId => [gId]), ...dualAllocs];
    }

    function evaluate(cards, modifiers) {
      const codes = cards.filter(Boolean).map(c => c.code);
      if (!codes.length || new Set(codes).size !== codes.length || codes.some(code => !byCode.has(code))) return null;
      const mods = modifiers.map((m, i) => cards[i] ? [...m].sort() : []);
      const counts = new Map();
      for (const m of mods) {
        const types = new Set();
        for (const id of m) {
          const type = attrs[id]?.Type;
          if (![1, 2].includes(type) || restricted.has(id) || types.has(type)) return null;
          types.add(type); counts.set(id, (counts.get(id) ?? 0) + 1);
          if (counts.get(id) > (stock.get(id) ?? 0)) return null;
        }
      }
      const key = JSON.stringify([cards.map(c => c?.code ?? null), mods]);
      if (cache.has(key)) return cache.get(key);
      if (best && now() >= deadline) return null;
      if (predictions >= limit) return null;
      predictions++;
      let rates;
      try {
        rates = rateCache.get(key);
        if (rates) cacheHits++;
        else {
          rates = preparedPredict(cards, mods);
          if (rateCache.size >= 30000) rateCache.delete(rateCache.keys().next().value);
          rateCache.set(key, rates);
        }
      } catch (error) { firstError ||= error.message; throw error; }

      const expected = expectedWins(kp, cards, rates);
      const metrics = planMetricsWithTargets(kp, cards, rates, config);
      const score = (config.fillAllSlots ? cards.filter(Boolean).length * 100000 : 0) + expected * 1000;
      const plan = {
        cards: cards.slice(), modifiers: mods, rates, expected, score,
        ...metrics
      };
      if (cache.size >= 30000) cache.delete(cache.keys().next().value);
      cache.set(key, plan);
      lineups.add(cards.map(c => c?.code ?? '-').join('|'));
      if (!best || comparePlans(plan, best, config, context) < 0) best = plan;
      return plan;
    }

    if (pool.length <= 10 && pool.length >= 4) {
      const permCards = [null, null, null, null];
      const usedIdx = new Set();
      function permute(pos) {
        if (pos === 4) {
          const defaultMods = permCards.map((c, i) => {
            const reward = parseSlotReward(slots(kp)[i]);
            if (reward.type === 'token') {
              const booster = findTokenBooster(settings.collection.modifiers);
              return booster?.id ? [booster.id] : [];
            }
            return [];
          });
          evaluate(permCards, defaultMods);
          return;
        }
        for (let i = 0; i < pool.length; i++) {
          if (usedIdx.has(i)) continue;
          usedIdx.add(i);
          permCards[pos] = pool[i];
          permute(pos + 1);
          usedIdx.delete(i);
        }
      }
      permute(0);
      if (best?.safe && searchMode === 'bare') return best;
    }

    const defaultSeedMods = () => Array.from({ length: 4 }, (_, i) => {
      const reward = parseSlotReward(slots(kp)[i]);
      if (reward.type === 'token') {
        const booster = findTokenBooster(settings.collection.modifiers);
        return booster?.id ? [booster.id] : [];
      }
      return [];
    });

    const seeds = seedPlans.map(p => ({
      cards: p.cards.map(c => c ? byCode.get(c.code) ?? null : null),
      modifiers: defaultSeedMods()
    }));
    for (let r = 0; r < config.searchRestarts; r++) seeds.push({
      cards: Array.from({ length: 4 }, (_, i) => i < pool.length ? pool[(i + r * 2) % pool.length] : null),
      modifiers: defaultSeedMods()
    });

    const starts = seeds.map(s => evaluate(s.cards, s.modifiers)).filter(Boolean);
    let lastYield = now(), iterations = 0;
    function cooperate() {
      if (root.PacificFrontBot?.isStopped?.()) return;
      checkpoint();
      if (++iterations % 64 === 0 && now() - lastYield >= 12) {
        lastYield = now(); return yieldUI().then(checkpoint);
      }
    }

    for (const start of starts) {
      if (root.PacificFrontBot?.isStopped?.()) break;
      let current = start;

      for (let pass = 0; pass < config.searchPasses; pass++) {
        const before = current;
        for (let pos = 0; pos < 4; pos++) {
          if (root.PacificFrontBot?.isStopped?.()) break;
          checkpoint();
          let next = current;
          for (const card of pool) {
            if (current.cards.some((c, i) => i !== pos && c?.code === card.code)) continue;
            const tempCards = current.cards.slice();
            tempCards[pos] = card;
            const slotAllocations = getSlotModifierAllocations(tempCards, pos);

            for (const allocation of slotAllocations) {
              const cards = tempCards.slice(), mods = current.modifiers.map(a => a.slice());
              mods[pos] = allocation;
              const candidate = evaluate(cards, mods);
              if (candidate && comparePlans(candidate, next, config, context) < 0) next = candidate;
              const pause = cooperate(); if (pause) await pause;
              if (root.PacificFrontBot?.isStopped?.()) break;
            }
            if (root.PacificFrontBot?.isStopped?.()) break;
          }
          current = next;
          await yieldUI(); checkpoint();
        }

        for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
          const cards = current.cards.slice(); [cards[a], cards[b]] = [cards[b], cards[a]];
          const following = current.modifiers.map(m => m.slice()); [following[a], following[b]] = [following[b], following[a]];
          for (const mods of [current.modifiers, following]) {
            const candidate = evaluate(cards, mods);
            if (candidate && comparePlans(candidate, current, config, context) < 0) current = candidate;
            const pause = cooperate(); if (pause) await pause;
          }
        }
        if (current === before) break;
      }
      if (root.PacificFrontBot?.isStopped?.()) break;
    }

    if (!best && firstError) throw Error(firstError);
    return best ? {
      ...best, predictions: lineups.size, jointPredictions: predictions, cacheHits,
      elapsedMs: Math.round(now() - startedAt)
    } : null;
  }

  function findPageBridge(doc) {
    const app = doc.getElementById?.('app');
    if (!app) return {};
    const key = Object.keys(app).find(k => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
    if (!key) return {};
    const seed = app[key];
    const queue = [seed?.stateNode?.current ?? seed?.current ?? seed];
    const visited = new Set(), bridge = {};
    while (queue.length && visited.size < 20000) {
      const fiber = queue.pop();
      if (!fiber || visited.has(fiber)) continue;
      visited.add(fiber);
      const p = fiber.memoizedProps ?? {};
      for (const store of [p.store, p.value?.store])
        if (typeof store?.dispatch === 'function' && typeof store?.getState === 'function') bridge.store = store;
      if (typeof p.router?.navigate === 'function') bridge.router = p.router;
      if (typeof p.client?.invalidateQueries === 'function') bridge.queryClient = p.client;
      if (bridge.store && bridge.router && bridge.queryClient) break;
      queue.push(fiber.child, fiber.sibling);
    }
    return bridge;
  }

  function toPageCard(card) {
    if (!card) return null;
    const specs = [0, 1, 2].map(id => card.specs?.[id] ?? 0);
    const p = specs.reduce((total, value) => total + value, 0);
    return { ...card, power: p };
  }

  function placePageCards(store, operationId, kp, cards, modifiers = [[], [], [], []], attrs = {}) {
    if (!store.getState().battleBoard) throw Error('页面战斗棋盘尚未初始化。');
    const pageCards = cards.map(toPageCard);
    const dispatch = (name, payload) => store.dispatch({ type: 'battleBoard/' + name, payload });
    dispatch('initKeypoint', { operationId, keypointId: kp.id, keypoint: kp });
    dispatch('setBattleAnimationPhase', null);
    const usedEntities = new Set();
    for (const board of Object.values(store.getState().battleBoard.keypoints)) {
      Object.values(board.modifiersEntityId ?? {}).forEach(id => usedEntities.add(id));
      for (const m of [...(board.modifiersGroupA ?? []), ...(board.modifiersGroupB ?? [])]) if (m) usedEntities.add(m.entityId);
    }
    for (const type of ['inventory_card', 'inventory_modifier_group_a', 'inventory_modifier_group_b']) {
      const group = type === 'inventory_modifier_group_a' ? 1 : 2;
      const placements = pageCards.map((c, i) => {
        if (type === 'inventory_card') return c ? { card: c } : null;
        const id = (modifiers[i] ?? []).find(id => attrs[id]?.Type === group);
        if (!id) return null;
        let index = 0;
        while (usedEntities.has(`${kp.id}:${id}:${index}`)) index++;
        const entityId = `${kp.id}:${id}:${index}`; usedEntities.add(entityId);
        return { modifier: { id, entityId } };
      });
      dispatch('setPreviews', { type, slots: placements });
      dispatch('applyPreviews', { keypointId: kp.id, dropTargetId: null });
    }
  }

  if (typeof module === 'object' && module.exports) return;
  if (!ALLOWED_ORIGINS.includes(location.origin)) return;
  if (root.PacificFrontBot) { console.info('PacificFrontBot 已加载。'); return; }

  let running = false, stopped = false, ui = null;
  const logLines = [];
  const config = { ...defaults };
  const predictionContexts = new Map();

  const log = message => {
    const text = `[${new Date().toLocaleTimeString()}] ${message}`;
    logLines.push(text); if (logLines.length > 100) logLines.shift();
    console.info('[PacificFrontBot]', message);
    if (ui) { ui.textContent = logLines.slice(-15).join('\n'); ui.scrollTop = ui.scrollHeight; }
  };

  const checkpoint = () => { if (stopped) throw Error('已由用户手动停止。'); };
  const sleep = async ms => {
    const end = Date.now() + ms;
    while (Date.now() < end) { checkpoint(); await new Promise(r => setTimeout(r, Math.min(200, end - Date.now()))); }
    checkpoint();
  };

  function validate() {
    if (!root.adeck?.predict || !root.defaultState?.settings?.collection?.cards)
      throw Error('游戏未加载完毕。请先登录、打开一个行动，等待页面显示后重试。');
  }

  async function api(path, body) {
    checkpoint();
    const method = body === undefined ? 'GET' : 'POST';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const headers = { Accept: 'application/json' };
      if (method === 'POST') {
        headers['Content-Type'] = 'application/json';
        const token = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('csrftoken='));
        if (token) headers['X-CSRFToken'] = decodeURIComponent(token.slice(10));
      }
      const response = await fetch('/api/v2/' + path, { method, headers, credentials: 'same-origin',
        cache: 'no-store', signal: controller.signal, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      if (!response.ok) throw Error(`HTTP ${response.status} (${path})`);
      const data = await response.json();
      return unwrapResponse(data, path);
    } finally { clearTimeout(timer); }
  }

  async function poll(read, accept, label) {
    for (let n = 0; n < 20; n++) {
      await sleep(config.delayMs);
      const value = await read();
      if (accept(value)) return value;
    }
    throw Error(label + '等待超时。');
  }

  async function readyInventory() {
    let status = await api('inventory/status/');
    if (status.inPending) await poll(() => api('inventory/status/'), s => !s.inPending, '库存同步');
    return await api('inventory/');
  }

  const readOperation = id => api(`operation/${encodeURIComponent(id)}/`);
  const readKeypoint = id => api(`keypoint/${encodeURIComponent(id)}/`);

  async function syncBoard(id, kp, plan, required = false) {
    if (!config.syncPage && !required) return;
    try {
      let bridge = findPageBridge(document);
      const path = operationPath(location.pathname, id, kp.id);
      if (location.pathname.replace(/\/$/, '') !== path) {
        if (!bridge.router) throw Error('未找到页面路由');
        await bridge.router.navigate(path);
      }
      for (let i = 0; i < 40; i++) {
        if (stopped) return;
        bridge = findPageBridge(document);
        if (bridge.store?.getState().battleBoard?.activeKeypointId === kp.id) break;
        await sleep(200);
      }
      if (!bridge.store || bridge.store.getState().battleBoard?.activeKeypointId !== kp.id) return;
      placePageCards(bridge.store, id, kp, plan.cards, plan.modifiers, root.adeck.getModifiers?.() ?? {});
      await sleep(300);
    } catch (error) {
      if (required) throw error;
      log(`页面选卡同步 [${kp.name ?? kp.id}]：${error.message}`);
    }
  }

  async function refreshPage(id, kp) {
    const bridge = findPageBridge(document);
    if (!bridge.queryClient) return;
    try {
      if (kp) bridge.queryClient.setQueryData?.(['keypoint', kp.id], { timestamp: Date.now() / 1000, result: kp });
      for (const queryKey of [['state'], ['operation', 'detail', id], ['inventory'], ['keypoint']])
        Promise.resolve(bridge.queryClient.invalidateQueries({ queryKey })).catch(() => {});
    } catch (error) {}
  }

  function printPlan(kp, plan, titlePrefix = '') {
    const header = titlePrefix ? `【${titlePrefix}】` : '';
    log(`${header}据点 ${kp.name ?? kp.id}：预计击败 ${plan.expected.toFixed(2)} / 4 个目标`);
    const kpSlots = slots(kp);
    plan.cards.forEach((c, i) => {
      if (!c) {
        log(`  [${i + 1}号位] 空位 / Empty`);
        return;
      }
      const rarity = getCardColor(c).label;
      const shipName = formatCardName(c);
      const mods = (plan.modifiers?.[i] ?? []).map(formatModifierName).join(' + ') || '无 / None (裸卡)';
      const hpWarn = c.health === 1 ? ' ⚠️1 HP濒死' : c.health === 2 ? ' ⚠️2 HP轻损' : '';
      const slotObj = kpSlots[i];
      const rewardInfo = parseSlotReward(slotObj);
      const targetPct = (getSlotTargetRate(slotObj) * 100).toFixed(0);

      log(`  [${i + 1}号位] [${rarity}] ${shipName} (战力 ${power(c)}) | HP: ${c.health}${hpWarn} | 胜率: ${(plan.rates[i] * 100).toFixed(1)}% (目标: ${targetPct}% ${rewardInfo.label}) | 道具: [${mods}]`);
    });
  }

  // --- 【无损去冗与清洁锁：杜绝多用绿道具与误挂】 ---
  function enforceFinalModCleanliness(choice, engine, settings) {
    const kpSlots = slots(choice.kp);
    const effects = effectPayloads(choice.op, choice.kp, settings.options.appliedEffectsCancelableClearThreshold ?? 1);
    const core = { ...engine.newSettings(), ...settings.options.defaultCoreSettings };
    const predictor = createPredictor(engine, core, choice.kp, effects);

    kpSlots.forEach((slot, idx) => {
      if (!choice.plan.cards[idx]) return;
      const reward = parseSlotReward(slot);
      let mods = choice.plan.modifiers[idx] ?? [];

      // 1. 物理清洗非代币槽的效率书
      if (reward.type !== 'token' || !reward.isTokenDrop) {
        mods = mods.filter(mId => !getModInfo(mId, settings.collection.modifiers).isToken);
      }
      // 2. 满血 3 HP 舰船绝对物理清洗快速维修包
      if (choice.plan.cards[idx].health >= 3) {
        mods = mods.filter(mId => !getModInfo(mId, settings.collection.modifiers).isRepair);
      }

      // 3. 终极无损去冗：试探是否有多余的绿道具 (例如密苏里单挂效率就能100%时剔除专精)
      const greenMod = mods.find(mId => getModInfo(mId, settings.collection.modifiers).isGreenSpecial);
      if (greenMod) {
        const testMods = choice.plan.modifiers.map(m => m.slice());
        testMods[idx] = mods.filter(mId => mId !== greenMod);
        try {
          const testRates = predictor(choice.plan.cards, testMods);
          const targetRate = getSlotTargetRate(slot);
          if (testRates[idx] >= targetRate - 1e-4) {
            mods = testMods[idx];
          }
        } catch (e) {}
      }

      choice.plan.modifiers[idx] = mods;
    });
  }

  // --- 【阶梯攻坚算法 (四阶递进 SOP：裸卡 ＞ 单白 ＞ 单绿 ＞ 双拼)】 ---
  async function planKeypointWithLadder(op, kp, inventory, excludedCodes = new Set(), context = {}) {
    const settings = root.defaultState.settings;
    const effects = effectPayloads(op, kp, settings.options.appliedEffectsCancelableClearThreshold ?? 1);
    const candidates = availableCards(settings.collection.cards, inventory, activeStage(op), effects, excludedCodes);
    if (!candidates.length) return null;

    const kpSlots = slots(kp);
    const core = { ...root.adeck.newSettings(), ...settings.options.defaultCoreSettings };
    const key = JSON.stringify([core, kpSlots.map(s => s?.enemy ?? null), effects,
      [...candidates].sort((a, b) => a.code.localeCompare(b.code))]);
    if (!predictionContexts.has(key)) {
      if (predictionContexts.size >= 3) predictionContexts.delete(predictionContexts.keys().next().value);
      predictionContexts.set(key, new Map());
    }

    // Step 1: 纯裸卡基准推演
    let plan = await optimizeJoint(root.adeck, settings, kp, candidates, effects, inventory, config, checkpoint,
      () => sleep(1), [], predictionContexts.get(key), async () => {}, { ...context, searchMode: 'bare' });

    if (plan?.safe) return plan;

    // Step 2: 单白战力补强
    const whitePlan = await optimizeJoint(root.adeck, settings, kp, candidates, effects, inventory, config, checkpoint,
      () => sleep(1), plan ? [plan] : [], predictionContexts.get(key), async () => {}, { ...context, searchMode: 'white' });

    if (whitePlan && comparePlans(whitePlan, plan, config, context) < 0) plan = whitePlan;
    if (plan?.safe) return plan;

    // Step 3: 单绿特殊破局攻坚
    const greenPlan = await optimizeJoint(root.adeck, settings, kp, candidates, effects, inventory, config, checkpoint,
      () => sleep(1), plan ? [plan] : [], predictionContexts.get(key), async () => {}, { ...context, searchMode: 'green', maxYMaxAllowed: 4 });

    if (greenPlan && comparePlans(greenPlan, plan, config, context) < 0) plan = greenPlan;
    if (plan?.safe) return plan;

    // Step 4: 四阶终极合体攻坚 (1白 + 1绿双拼) 彻底消灭 76% 瓶颈！
    const dualPlan = await optimizeJoint(root.adeck, settings, kp, candidates, effects, inventory, config, checkpoint,
      () => sleep(1), plan ? [plan] : [], predictionContexts.get(key), async () => {}, { ...context, searchMode: 'dual', maxYMaxAllowed: 4 });

    if (dualPlan && comparePlans(dualPlan, plan, config, context) < 0) plan = dualPlan;

    return plan;
  }

  async function planStageSequentially(op, stage, inventory, remainingKeypoints) {
    const sorted = [...remainingKeypoints].sort((a, b) => getKeypointThreat(b) - getKeypointThreat(a));
    const stageAssignedCodes = new Set();
    const plansMap = new Map();

    const effects = effectPayloads(op, sorted[0], root.defaultState.settings.options.appliedEffectsCancelableClearThreshold ?? 1);
    const totalAvailCards = availableCards(root.defaultState.settings.collection.cards, inventory, activeStage(op), effects);
    const totalYellowCount = totalAvailCards.filter(c => getCardColor(c).rank >= 7).length;

    sorted.forEach((brief) => {
      const kpSlots = slots(brief);
      const heavyEnemyCount = kpSlots.filter(s => s?.enemy && power(s.enemy) >= 150).length;
      brief.maxYMaxAllowed = Math.min(totalYellowCount, Math.max(2, heavyEnemyCount));
    });

    for (const brief of sorted) {
      if (stopped) break;
      const kp = await readKeypoint(brief.id);
      const isFinalBoss = isFinalTokenBossNode(op, kp);
      const isCommonBossBattle = slots(kp).some(s => isCommonBoss(s?.enemy));
      const threat = getKeypointThreat(kp);

      const tag = isFinalBoss ? '👑 关底决战Boss/Final Epic' :
        isCommonBossBattle ? '⚔️ 黄卡精英据点' :
        threat >= 500 ? '🛡️ 困难攻坚据点' : '⚓ 简单小怪据点';

      log(`📐 规划 [${kp.name ?? kp.id}] [${tag}]，已锁前置手牌 ${stageAssignedCodes.size} 张 (动态黄卡配额: ${brief.maxYMaxAllowed})...`);

      const context = {
        isFinalBoss, isCommonBossBattle,
        maxYMaxAllowed: isFinalBoss ? 4 : brief.maxYMaxAllowed,
        collectionMods: root.defaultState.settings.collection.modifiers
      };

      const plan = await planKeypointWithLadder(op, kp, inventory, stageAssignedCodes, context);
      if (plan && plan.cards.some(Boolean)) {
        plansMap.set(kp.id, { op, kp, plan, context });
        plan.cards.filter(Boolean).forEach(c => stageAssignedCodes.add(c.code));
      }
    }
    return { sorted, plansMap };
  }

  // --- 主业务工作流 ---
  async function work(mode) {
    const preview = mode === 'preview', fillOnly = mode === 'fill';
    validate();

    const state = await api('state/');
    if (state.status?.state === 'unauth') throw Error('请先登录游戏。');
    const routeId = routeInfo(location.pathname).operationId;
    const id = state.status?.operationId ?? routeId;
    if (!id) throw Error('请先在网页上进入一个行动页面。');

    let op = await readOperation(id);
    if (!op.isStarted && !preview && !fillOnly) {
      log('开始当前行动。');
      await api('operation/start/', { operationId: id });
      op = await poll(() => readOperation(id), o => o.isStarted, '行动开始');
    }

    let battles = 0;
    while (!stopped) {
      op = await readOperation(id);
      if (op.isFinished) { log('行动已全部完成！'); return; }
      const stage = activeStage(op);
      if (!stage) throw Error('没有可识别的当前阶段。');

      const remaining = stage.keypoints.filter(k => !finished(k));
      if (!remaining.length) {
        const next = op.stages[op.stages.indexOf(stage) + 1];
        if (next && !preview && !fillOnly) {
          log('🎉 当前阶段所有据点已全清！进入下一阶段...');
          await api('operation/next-stage/', {});
          await poll(() => readOperation(id), o => activeStage(o)?.id === next.id, '阶段切换');
          await refreshPage(id);
          continue;
        }
        log('所有可用阶段据点已全清。');
        return;
      }

      if (battles >= config.maxBattles) { log('已达战斗场次上限。'); return; }

      let inventory = await readyInventory();

      log(`🔄 启动当前阶段 (${remaining.length} 据点) 全局统筹规划...`);
      const { sorted, plansMap } = await planStageSequentially(op, stage, inventory, remaining);

      if (stopped) {
        const firstEntry = plansMap.values().next().value;
        if (firstEntry) {
          log('🛑 [用户中止计算] 已提取当前最优方案回填卡槽。');
          await syncBoard(id, firstEntry.kp, firstEntry.plan, true);
        }
        log('已安全停止。');
        return;
      }

      if (plansMap.size === 0) {
        if (stageDone(stage)) {
          log('阶段目标已达成，安全前往下一阶段。');
          const next = op.stages[op.stages.indexOf(stage) + 1];
          if (next && !preview && !fillOnly) {
            await api('operation/next-stage/', {});
            await poll(() => readOperation(id), o => activeStage(o)?.id === next.id, '阶段切换');
            await refreshPage(id);
            continue;
          }
        }
        throw Error('没有找到满足达标线的可用阵容。');
      }

      // 【阶段全域排兵布阵】
      log(`🏛️ 【阶段全局部署】开始将推演好的 ${plansMap.size} 个据点阵型全量填入作战棋盘...`);
      for (let i = 0; i < sorted.length; i++) {
        if (stopped) break;
        const brief = sorted[i];
        if (!plansMap.has(brief.id)) continue;
        const item = plansMap.get(brief.id);

        enforceFinalModCleanliness(item, root.adeck, root.defaultState.settings);

        log(`📍 [${i + 1}/${sorted.length}] 正在为据点 [${item.kp.name ?? item.kp.id}] 装载卡牌与道具...`);
        await syncBoard(id, item.kp, item.plan, true);
        printPlan(item.kp, item.plan, `阶段部署确认 - ${item.kp.name ?? item.kp.id}`);
      }

      if (fillOnly) {
        log('✅ 当前阶段所有据点已完成全局选卡排阵，准备就绪！');
        return;
      }

      if (preview) {
        log('👀 预览结束：全阶段阵型已全部展示并部署在棋盘，未发送战斗请求。');
        return;
      }

      log(`🚀 【全军就绪】当前阶段全域阵型已布设完毕！开始按战略攻坚顺序依次发起出战...`);
      await sleep(1000);

      for (const targetBrief of sorted) {
        if (stopped) break;
        if (!plansMap.has(targetBrief.id)) continue;

        const choice = plansMap.get(targetBrief.id);
        const kpId = choice.kp.id;

        const currentKp = await readKeypoint(kpId);
        if (finished(currentKp)) continue;

        // 【门禁安全审查 (Gatekeeper)】
        if (!choice.plan.safe) {
          log(`🛑 【门禁拦截】据点 [${choice.kp.name ?? choice.kp.id}] 未达到安全胜率线 (最弱槽胜率: ${(choice.plan.weakestRate*100).toFixed(1)}%)！`);
          log(`🛑 为严防弃坑翻车并保护修船包等珍贵资产，脚本已暂停自动战斗，请手动微调或确认！`);
          await syncBoard(id, choice.kp, choice.plan, true);
          return;
        }

        log(`⚔️ [攻坚就绪] 正在切入据点 [${choice.kp.name ?? choice.kp.id}] 发起出战...`);
        await syncBoard(id, choice.kp, choice.plan, true);

        checkpoint();
        const battleSetup = {
          slots: choice.plan.cards.map((c, i) => c ? {
            cardCode: c.code,
            ...((choice.plan.modifiers?.[i]?.length ?? 0) > 0 ? { modifiers: choice.plan.modifiers[i] } : {})
          } : null)
        };

        log(`💥 提交据点 [${choice.kp.name ?? choice.kp.id}] 出战...`);
        await api('keypoint/start/', { keypointId: choice.kp.id, battleSetup });
        const result = await poll(() => readKeypoint(choice.kp.id), finished, '战斗结算');
        await refreshPage(id, result);

        const wonCount = slots(result).filter(s => s?.outcome === 'win').length;
        log(`🎖️ 据点 [${choice.kp.name ?? choice.kp.id}] 战斗已结算：击破 ${wonCount} / 4 个目标！`);
        battles++;
        await sleep(config.delayMs);

        if (wonCount < 4) {
          log(`⚠️ 据点未达成 4/4 全胜，触发【战局自适应重估机制】，正在基于最新血量重新统筹后续据点...`);
          break;
        }
      }
    }
  }

  async function start(mode) {
    if (running) { log('已有任务运行中。'); return; }
    running = true; stopped = false;
    try {
      await work(mode);
    } catch (e) {
      if (e.message.includes('手动停止')) log('操作已中止。');
      else log('错误: ' + e.message);
    } finally {
      running = false;
    }
  }

  root.PacificFrontBot = {
    version: SCRIPT_VERSION, config,
    preview: () => start('preview'),
    fill: () => start('fill'),
    run: () => start('run'),
    stop: () => {
      stopped = true;
      log('已收到停止指令，提取当前最佳阵容回填卡槽...');
    },
    isStopped: () => stopped,
    get running() { return running; },
    get logs() { return logLines.slice(); }
  };

  const host = document.createElement('div');
  host.id = 'pacific-front-bot-panel';
  host.style.cssText = 'position:fixed;right:20px;top:80px;width:350px;z-index:2147483647;user-select:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
<style>
:host { color: #f0f4f8; font: 13px/1.4 system-ui, -apple-system, sans-serif; }
section {
  background: rgba(16, 33, 50, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(103, 132, 157, 0.5);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  transition: background 0.25s ease, border-color 0.25s ease;
}
section:hover {
  background: rgba(16, 33, 50, 0.92);
  border-color: rgba(103, 132, 157, 0.85);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  cursor: grab;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.header:active { cursor: grabbing; }
h3 { margin: 0; font-size: 13px; font-weight: 600; color: #a4d2ff; pointer-events: none; }
.btn-group { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
button {
  padding: 5px 9px;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  background: #2a4763;
  color: #eaf2f8;
  font-size: 12px;
  transition: background 0.15s;
}
button:hover { background: #3b638a; }
button.primary { background: #2f80ed; color: #fff; font-weight: bold; }
button.primary:hover { background: #1f6fd9; }
button.danger { background: #b03a2e; color: #fff; }
button.danger:hover { background: #922b21; }
pre {
  font: 11px/1.45 SFMono-Regular, Consolas, Monaco, monospace;
  white-space: pre-wrap;
  max-height: 240px;
  overflow-y: auto;
  margin: 0;
  padding: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #c9d8e5;
  user-select: text;
}
.note { color: #8faec5; font-size: 11px; margin-bottom: 8px; }
</style>
<section>
  <div class="header" title="按住可随意拖拽窗口位置">
    <h3>Pacific Front 游玩 v${SCRIPT_VERSION} ✛</h3>
    <button id="hide" style="padding:2px 6px;font-size:11px;">收起</button>
  </div>
  <div class="note">⭐ 四阶双拼攻坚 · 煤炭战略确权 · 门禁一票否决</div>
  <div class="btn-group">
    <button id="fill">自动选卡</button>
    <button id="run" class="primary">自动游玩</button>
    <button id="preview">仅预览</button>
    <button id="stop" class="danger">停止并选定</button>
  </div>
  <pre></pre>
</section>`;

  ui = shadow.querySelector('pre');
  shadow.querySelector('#preview').onclick = () => start('preview');
  shadow.querySelector('#fill').onclick = () => start('fill');
  shadow.querySelector('#run').onclick = () => start('run');
  shadow.querySelector('#stop').onclick = () => root.PacificFrontBot.stop();

  const hideBtn = shadow.querySelector('#hide');
  hideBtn.onclick = () => {
    ui.hidden = !ui.hidden;
    hideBtn.textContent = ui.hidden ? '展开' : '收起';
  };

  const header = shadow.querySelector('.header');
  let isDragging = false, startX, startY, origLeft, origTop;
  header.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = host.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;
    host.style.right = 'auto';
    host.style.left = `${origLeft}px`;
    host.style.top = `${origTop}px`;
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const maxLeft = window.innerWidth - host.offsetWidth - 5;
    const maxTop = window.innerHeight - host.offsetHeight - 5;
    host.style.left = `${Math.max(5, Math.min(maxLeft, origLeft + dx))}px`;
    host.style.top = `${Math.max(5, Math.min(maxTop, origTop + dy))}px`;
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  document.documentElement.append(host);
  log(`v${SCRIPT_VERSION} 已加载：四阶双拼攻坚、煤炭战略确权、无损去冗生效。`);
})(typeof window === 'object' ? window : globalThis);
