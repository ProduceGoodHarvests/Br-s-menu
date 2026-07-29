var LEVELS = [
  { level: 1, name: '普通会员', minScore: 0, discountPercent: 100, discountText: '原价' },
  { level: 2, name: '银卡会员', minScore: 100, discountPercent: 90, discountText: '9折' },
  { level: 3, name: '金卡会员', minScore: 500, discountPercent: 80, discountText: '8折' },
  { level: 4, name: '黑金会员', minScore: 1000, discountPercent: 70, discountText: '7折' }
];

function getMembership(score) {
  var points = Math.max(0, Math.floor(Number(score || 0)));
  var current = LEVELS[0];
  for (var i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].minScore) current = LEVELS[i];
  }
  var next = LEVELS[current.level] || null;
  var range = next ? next.minScore - current.minScore : 0;
  return {
    level: current.level,
    name: current.name,
    minScore: current.minScore,
    discountPercent: current.discountPercent,
    discountText: current.discountText,
    nextLevel: next ? next.level : null,
    nextLevelName: next ? next.name : '',
    nextLevelScore: next ? next.minScore : null,
    scoreToNext: next ? Math.max(0, next.minScore - points) : 0,
    progress: next ? Math.min(100, Math.round((points - current.minScore) / range * 100)) : 100
  };
}

function enrichMember(member) {
  if (!member) return null;
  var calculated = getMembership(member.score);
  var hasServerMembership = !!member.levelName && member.discountPercent !== undefined;
  member.level = Number(hasServerMembership ? member.level : calculated.level);
  member.levelName = hasServerMembership ? member.levelName : calculated.name;
  member.discountPercent = Number(hasServerMembership ? member.discountPercent : calculated.discountPercent);
  member.discountText = hasServerMembership ? member.discountText : calculated.discountText;
  member.nextLevel = member.nextLevel === null ? null : (member.nextLevel || calculated.nextLevel);
  member.nextLevelName = member.nextLevelName || calculated.nextLevelName;
  member.nextLevelScore = member.nextLevelScore === null ? null : (member.nextLevelScore || calculated.nextLevelScore);
  member.scoreToNext = Number(member.scoreToNext !== undefined ? member.scoreToNext : calculated.scoreToNext);
  member.levelProgress = Number(member.levelProgress !== undefined ? member.levelProgress : calculated.progress);
  member.progressStyle = 'width: ' + member.levelProgress + '%';
  member.coinText = Number(member.balance || 0).toFixed(2);
  return member;
}

module.exports = {
  LEVELS: LEVELS,
  getMembership: getMembership,
  enrichMember: enrichMember
};
