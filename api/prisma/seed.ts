import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Stage definitions
  const stages = await Promise.all([
    prisma.stageDefinition.upsert({
      where: { key: 'lead' },
      update: {},
      create: { key: 'lead', label: 'Lead', dotColor: '#9CA29B', sortOrder: 1 },
    }),
    prisma.stageDefinition.upsert({
      where: { key: 'active' },
      update: {},
      create: { key: 'active', label: 'Active', dotColor: '#3B82F6', sortOrder: 2 },
    }),
    prisma.stageDefinition.upsert({
      where: { key: 'applied' },
      update: {},
      create: { key: 'applied', label: 'Applied', dotColor: '#14B8A6', sortOrder: 3 },
    }),
    prisma.stageDefinition.upsert({
      where: { key: 'enrolled' },
      update: {},
      create: { key: 'enrolled', label: 'Enrolled', dotColor: '#22C55E', sortOrder: 4 },
    }),
    prisma.stageDefinition.upsert({
      where: { key: 'archived' },
      update: {},
      create: { key: 'archived', label: 'Archived', dotColor: '#6B7280', sortOrder: 5 },
    }),
    prisma.stageDefinition.upsert({
      where: { key: 'closed' },
      update: {},
      create: { key: 'closed', label: 'Closed', dotColor: '#4B5563', sortOrder: 6 },
    }),
  ]);
  const stageMap = Object.fromEntries(stages.map((s) => [s.key, s.id]));

  // Agents
  const agentsData = [
    { name: 'Ploy Siriwan', initials: 'PS', role: 'agent', avatarColor: '#7C6FE0', email: 'ploy@dreamabroad.co' },
    { name: 'Ann Chanida', initials: 'AC', role: 'agent', avatarColor: '#3FA98A', email: 'ann@dreamabroad.co' },
    { name: 'Bua Thanaporn', initials: 'BT', role: 'agent', avatarColor: '#E08A5C', email: 'bua@dreamabroad.co' },
    { name: 'Khun Nat', initials: 'KN', role: 'manager', avatarColor: '#1A1815', email: 'nat@dreamabroad.co' },
  ];
  const agents = await Promise.all(
    agentsData.map((a) =>
      prisma.agent.upsert({
        where: { email: a.email },
        update: {},
        create: a,
      }),
    ),
  );
  const agentByEmail: Record<string, number> = {};
  for (const a of agents) agentByEmail[a.email] = a.id;
  const a1 = agentByEmail['ploy@dreamabroad.co'];
  const a2 = agentByEmail['ann@dreamabroad.co'];
  const a3 = agentByEmail['bua@dreamabroad.co'];

  // Tag definitions
  const tagDefs = [
    // Current schools (purple)
    { tagType: 'current_school', label: 'Chulalongkorn', sortOrder: 1, colorBg: '#EEEDFE', colorBorder: '#AFA9EC', colorText: '#3C3489' },
    { tagType: 'current_school', label: 'Mahidol', sortOrder: 2, colorBg: '#EEEDFE', colorBorder: '#AFA9EC', colorText: '#3C3489' },
    { tagType: 'current_school', label: 'Thammasat', sortOrder: 3, colorBg: '#EEEDFE', colorBorder: '#AFA9EC', colorText: '#3C3489' },
    { tagType: 'current_school', label: 'CMU', sortOrder: 4, colorBg: '#EEEDFE', colorBorder: '#AFA9EC', colorText: '#3C3489' },
    { tagType: 'current_school', label: 'KMUTT', sortOrder: 5, colorBg: '#EEEDFE', colorBorder: '#AFA9EC', colorText: '#3C3489' },
    { tagType: 'current_school', label: 'Kasetsart', sortOrder: 6, colorBg: '#EEEDFE', colorBorder: '#AFA9EC', colorText: '#3C3489' },
    // Interested schools (teal) — grouped by country
    { tagType: 'interested_school', label: 'Waseda', countryCode: 'Japan', sortOrder: 1, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    { tagType: 'interested_school', label: 'Keio', countryCode: 'Japan', sortOrder: 2, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    { tagType: 'interested_school', label: 'Sophia', countryCode: 'Japan', sortOrder: 3, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    { tagType: 'interested_school', label: 'UCL', countryCode: 'UK', sortOrder: 4, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    { tagType: 'interested_school', label: "King's", countryCode: 'UK', sortOrder: 5, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    { tagType: 'interested_school', label: 'Edinburgh', countryCode: 'UK', sortOrder: 6, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    { tagType: 'interested_school', label: 'Monash', countryCode: 'Australia', sortOrder: 7, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    { tagType: 'interested_school', label: 'ANU', countryCode: 'Australia', sortOrder: 8, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    { tagType: 'interested_school', label: 'NUS', countryCode: 'Singapore', sortOrder: 9, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    { tagType: 'interested_school', label: 'NTU', countryCode: 'Singapore', sortOrder: 10, colorBg: '#E1F5EE', colorBorder: '#5DCAA5', colorText: '#085041' },
    // Countries (coral)
    { tagType: 'country', label: 'Japan', sortOrder: 1, colorBg: '#FAECE7', colorBorder: '#F0997B', colorText: '#712B13' },
    { tagType: 'country', label: 'UK', sortOrder: 2, colorBg: '#FAECE7', colorBorder: '#F0997B', colorText: '#712B13' },
    { tagType: 'country', label: 'Australia', sortOrder: 3, colorBg: '#FAECE7', colorBorder: '#F0997B', colorText: '#712B13' },
    { tagType: 'country', label: 'Singapore', sortOrder: 4, colorBg: '#FAECE7', colorBorder: '#F0997B', colorText: '#712B13' },
    { tagType: 'country', label: 'USA', sortOrder: 5, colorBg: '#FAECE7', colorBorder: '#F0997B', colorText: '#712B13' },
    { tagType: 'country', label: 'New Zealand', sortOrder: 6, colorBg: '#FAECE7', colorBorder: '#F0997B', colorText: '#712B13' },
    // Programs (amber)
    { tagType: 'program', label: 'MBA', sortOrder: 1, colorBg: '#FAEEDA', colorBorder: '#EF9F27', colorText: '#633806' },
    { tagType: 'program', label: 'Computer Science', sortOrder: 2, colorBg: '#FAEEDA', colorBorder: '#EF9F27', colorText: '#633806' },
    { tagType: 'program', label: 'Data Science', sortOrder: 3, colorBg: '#FAEEDA', colorBorder: '#EF9F27', colorText: '#633806' },
    { tagType: 'program', label: 'Engineering', sortOrder: 4, colorBg: '#FAEEDA', colorBorder: '#EF9F27', colorText: '#633806' },
    { tagType: 'program', label: 'Design', sortOrder: 5, colorBg: '#FAEEDA', colorBorder: '#EF9F27', colorText: '#633806' },
    { tagType: 'program', label: 'Law', sortOrder: 6, colorBg: '#FAEEDA', colorBorder: '#EF9F27', colorText: '#633806' },
    { tagType: 'program', label: 'Medicine', sortOrder: 7, colorBg: '#FAEEDA', colorBorder: '#EF9F27', colorText: '#633806' },
  ];

  const createdTags = await Promise.all(
    tagDefs.map((t) =>
      prisma.tagDefinition.upsert({
        where: { tagType_label: { tagType: t.tagType, label: t.label } },
        update: {},
        create: t,
      }),
    ),
  );
  const tagMap: Record<string, number> = {};
  for (const t of createdTags) tagMap[`${t.tagType}:${t.label}`] = t.id;

  // Demo customers + messages — only seeded when SEED_DEMO=true.
  // Real LINE customers come via webhook; keep DB clean by default.
  if (process.env.SEED_DEMO !== 'true') {
    console.log('Config seeded (stages, tags, agents). Skipping demo customers.');
    console.log('Set SEED_DEMO=true to also seed the 12 demo customers.');
    return;
  }
  console.log('SEED_DEMO=true — seeding demo customers and messages...');

  // Customers
  const customersData = [
    { lineUserId: 'U9f3a12345', displayName: 'Somchai Wattanakul', initials: 'SW', avatarColor: '#7C6FE0', stage: 'active', score: 5, urgent: true, agent: a1, followedAt: '2025-01-03', lastMessageAt: '2025-01-15T09:22:00Z', lastReplyAt: '2025-01-15T11:15:00Z', lastReplyBy: a1, totalMessages: 7, tags: [['current_school','Chulalongkorn'],['interested_school','Waseda'],['interested_school','Keio'],['country','Japan'],['program','MBA']], notes: 'Attended open day Jan 2. Gap year student — targeting Oct intake. Send Waseda scholarship PDF.' },
    { lineUserId: 'U8b2c45678', displayName: 'Nattapon Panya', initials: 'NP', avatarColor: '#3FA98A', stage: 'active', score: 4, urgent: false, agent: a1, followedAt: '2025-01-05', lastMessageAt: '2025-01-16T17:30:00Z', lastReplyAt: '2025-01-16T14:00:00Z', lastReplyBy: a1, totalMessages: 5, tags: [['current_school','Mahidol'],['interested_school','UCL'],['interested_school',"King's"],['country','UK'],['program','Computer Science']], notes: 'Parents want UK. IELTS 7.0. Needs deadline awareness — UCAS Jan 29 deadline.' },
    { lineUserId: 'U7d3e56789', displayName: 'Praewa Kaewkla', initials: 'PK', avatarColor: '#E5A23B', stage: 'active', score: 4, urgent: false, agent: a2, followedAt: '2025-01-08', lastMessageAt: '2025-01-16T22:30:00Z', lastReplyAt: '2025-01-16T16:00:00Z', lastReplyBy: a2, totalMessages: 4, tags: [['current_school','KMUTT'],['interested_school','NUS'],['country','Singapore'],['program','Data Science']], notes: 'Very responsive. Application fee was a concern — sent fee waiver info.' },
    { lineUserId: 'U6e4f67890', displayName: 'Kanya Srisuk', initials: 'KS', avatarColor: '#E08A5C', stage: 'lead', score: 2, urgent: false, agent: a2, followedAt: '2025-01-14', lastMessageAt: '2025-01-16T15:00:00Z', lastReplyAt: null, lastReplyBy: null, totalMessages: 1, tags: [['country','Japan']], notes: '' },
    { lineUserId: 'U5f5g78901', displayName: 'Jira Phon', initials: 'JP', avatarColor: '#7C6FE0', stage: 'applied', score: 5, urgent: false, agent: a1, followedAt: '2024-12-01', lastMessageAt: '2025-01-14T10:00:00Z', lastReplyAt: '2025-01-14T11:00:00Z', lastReplyBy: a1, totalMessages: 12, tags: [['current_school','Chulalongkorn'],['interested_school','Waseda'],['country','Japan'],['program','MBA']], notes: 'Application submitted Oct 3. Interview scheduled Nov 12. Awaiting Waseda decision.' },
    { lineUserId: 'Ua1b2c3d4', displayName: 'Thanin Chaiyaporn', initials: 'TC', avatarColor: '#3FA98A', stage: 'lead', score: 3, urgent: false, agent: a1, followedAt: '2025-01-12', lastMessageAt: '2025-01-17T01:40:00Z', lastReplyAt: '2025-01-17T01:55:00Z', lastReplyBy: a1, totalMessages: 3, tags: [['current_school','Thammasat'],['interested_school','Monash'],['interested_school','ANU'],['country','Australia'],['program','Engineering']], notes: 'Asked about Group of Eight ranking. Budget AUD 60k/yr.' },
    { lineUserId: 'Ub5c6d7e8', displayName: 'Anong Boontham', initials: 'AB', avatarColor: '#E08A5C', stage: 'lead', score: 1, urgent: true, agent: a3, followedAt: '2025-01-10', lastMessageAt: '2025-01-14T22:00:00Z', lastReplyAt: null, lastReplyBy: null, totalMessages: 2, tags: [['country','USA']], notes: 'Cold lead — hasn’t replied to follow-up. Try one more nudge.' },
    { lineUserId: 'Uf3g4h5i6', displayName: 'Worawit Kongthong', initials: 'WK', avatarColor: '#E5A23B', stage: 'active', score: 3, urgent: false, agent: a3, followedAt: '2025-01-07', lastMessageAt: '2025-01-16T20:00:00Z', lastReplyAt: '2025-01-16T20:30:00Z', lastReplyBy: a3, totalMessages: 8, tags: [['current_school','Kasetsart'],['interested_school','Edinburgh'],['interested_school','UCL'],['country','UK'],['program','Law']], notes: 'LLB hopeful. Strong personal statement draft — needs editing pass.' },
    { lineUserId: 'Uj7k8l9m0', displayName: 'Manee Sirikiat', initials: 'MS', avatarColor: '#7C6FE0', stage: 'applied', score: 4, urgent: false, agent: a2, followedAt: '2024-11-15', lastMessageAt: '2025-01-16T18:00:00Z', lastReplyAt: '2025-01-16T18:20:00Z', lastReplyBy: a2, totalMessages: 15, tags: [['current_school','CMU'],['interested_school','NUS'],['interested_school','NTU'],['country','Singapore'],['program','Design']], notes: 'Portfolio submitted. NTU ADM interview next week. Coaching session booked.' },
    { lineUserId: 'Un1o2p3q4', displayName: 'Rapeepan Tongdee', initials: 'RT', avatarColor: '#3FA98A', stage: 'enrolled', score: 5, urgent: false, agent: a1, followedAt: '2024-09-20', lastMessageAt: '2025-01-12T14:00:00Z', lastReplyAt: '2025-01-12T15:30:00Z', lastReplyBy: a1, totalMessages: 24, tags: [['current_school','Chulalongkorn'],['interested_school','Keio'],['country','Japan'],['program','MBA']], notes: 'Enrolled Keio April intake. Visa processing in progress. Pre-departure briefing Feb 20.' },
    { lineUserId: 'Ur5s6t7u8', displayName: 'Chanin Sirisak', initials: 'CS', avatarColor: '#E08A5C', stage: 'enrolled', score: 5, urgent: false, agent: a2, followedAt: '2024-08-10', lastMessageAt: '2025-01-10T11:00:00Z', lastReplyAt: '2025-01-10T11:30:00Z', lastReplyBy: a2, totalMessages: 31, tags: [['current_school','Mahidol'],['interested_school','Monash'],['country','Australia'],['program','Medicine']], notes: 'Monash MBBS confirmed. Accommodation sorted. Flight booked for Feb 24.' },
    { lineUserId: 'Uv9w0x1y2', displayName: 'Patcharin Thongchai', initials: 'PT', avatarColor: '#E5A23B', stage: 'applied', score: 3, urgent: true, agent: a3, followedAt: '2024-12-18', lastMessageAt: '2025-01-14T08:00:00Z', lastReplyAt: '2025-01-14T08:45:00Z', lastReplyBy: a3, totalMessages: 9, tags: [['current_school','Thammasat'],['interested_school','UCL'],['country','UK'],['program','Law']], notes: 'UCL application — missing reference letter. Chase tutor by Friday or miss deadline.' },
  ];

  for (const c of customersData) {
    const existing = await prisma.customer.findUnique({ where: { lineUserId: c.lineUserId } });
    if (existing) continue;

    const customer = await prisma.customer.create({
      data: {
        lineUserId: c.lineUserId,
        displayName: c.displayName,
        initials: c.initials,
        avatarColor: c.avatarColor,
        stageId: stageMap[c.stage],
        commitmentScore: c.score,
        urgencyFlag: c.urgent,
        notes: c.notes || null,
        assignedAgentId: c.agent,
        followedAt: new Date(c.followedAt),
        lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt) : null,
        lastReplyAt: c.lastReplyAt ? new Date(c.lastReplyAt) : null,
        lastReplyBy: c.lastReplyBy,
        totalMessages: c.totalMessages,
      },
    });

    // Tags
    for (const [type, label] of c.tags) {
      const tagId = tagMap[`${type}:${label}`];
      if (tagId) {
        await prisma.customerTag.create({
          data: { customerId: customer.id, tagDefinitionId: tagId },
        });
      }
    }
  }

  // Messages
  const messageData: Record<string, Array<{ dir: string; body: string; sentAt: string; agentId?: number }>> = {
    'U9f3a12345': [
      { dir: 'in', body: 'สวัสดีครับ พี่ ผมสนใจไปเรียนต่อที่ญี่ปุ่นครับ', sentAt: '2025-01-03T14:20:00Z' },
      { dir: 'out', body: 'สวัสดีค่ะคุณสมชาย ขอบคุณที่ติดต่อ DreamAbroad นะคะ 🎌 สนใจมหาวิทยาลัยไหนเป็นพิเศษคะ?', sentAt: '2025-01-03T14:35:00Z', agentId: a1 },
      { dir: 'in', body: 'อยากเข้า Waseda กับ Keio ครับ MBA ครับ', sentAt: '2025-01-03T14:42:00Z' },
      { dir: 'out', body: 'ดีค่ะ ทั้งสองที่เปิดรับ October intake ค่ะ deadline สมัครคือ April–June แล้วแต่โปรแกรม จะส่งข้อมูล scholarship ไปให้ดูนะคะ', sentAt: '2025-01-03T14:55:00Z', agentId: a1 },
      { dir: 'in', body: 'ผมเรียนจบจุฬาฯแล้วครับ GPA 3.65 ตอนนี้ทำงานอยู่ 2 ปี IELTS 7.5', sentAt: '2025-01-15T09:22:00Z' },
      { dir: 'out', body: 'profile น่าสนใจมากค่ะ! Waseda Business School ค่อนข้างชอบคน working experience น่าจะมีโอกาสได้ scholarship ลองดู open day ออนไลน์ Feb 8 ค่ะ', sentAt: '2025-01-15T11:15:00Z', agentId: a1 },
    ],
    'U8b2c45678': [
      { dir: 'in', body: 'Hi, I want to apply for Computer Science in the UK', sentAt: '2025-01-05T11:00:00Z' },
      { dir: 'out', body: 'Hi Nattapon! Great choice. Which universities are on your shortlist?', sentAt: '2025-01-05T11:08:00Z', agentId: a1 },
      { dir: 'in', body: 'UCL กับ King\'s ครับ พ่อแม่อยากให้เรียน UK เพราะใกล้ญาติ', sentAt: '2025-01-05T11:15:00Z' },
      { dir: 'out', body: 'เข้าใจค่ะ UCAS deadline สำหรับ Jan 29 นะคะ ส่ง personal statement มาให้ดูได้ค่ะ', sentAt: '2025-01-16T14:00:00Z', agentId: a1 },
      { dir: 'in', body: 'พี่ครับ ผมเขียน PS เสร็จแล้ว แต่มันยาว 4500 characters เกินมั้ยครับ? UCAS บอก 4000 max', sentAt: '2025-01-16T17:30:00Z' },
    ],
    'U7d3e56789': [
      { dir: 'in', body: 'สนใจ Data Science ที่ NUS ค่ะ', sentAt: '2025-01-08T09:30:00Z' },
      { dir: 'out', body: 'สวัสดีค่ะคุณแพรว NUS MSc Data Science เป็นโปรแกรมที่ดีมากค่ะ application fee SGD 50 แต่ตอนนี้มี waiver ถึง Feb', sentAt: '2025-01-08T10:00:00Z', agentId: a2 },
      { dir: 'in', body: 'ขอบคุณค่ะ! แล้ว portfolio ต้องเตรียมอะไรบ้างคะ?', sentAt: '2025-01-16T15:30:00Z' },
      { dir: 'out', body: 'ส่ง requirement list ไปให้ทาง email นะคะ ลองดู NUS รับ GitHub projects + course certificates ค่ะ', sentAt: '2025-01-16T16:00:00Z', agentId: a2 },
      { dir: 'in', body: 'ได้แล้วค่ะ จะเริ่มเตรียม GitHub portfolio เลย', sentAt: '2025-01-16T22:30:00Z' },
    ],
    'U6e4f67890': [
      { dir: 'in', body: 'สวัสดีค่ะ อยากสอบถามเรื่องเรียนภาษาที่ญี่ปุ่นค่ะ ไม่ทราบว่ามี course แนะนำมั้ยคะ?', sentAt: '2025-01-16T15:00:00Z' },
    ],
    'U5f5g78901': [
      { dir: 'in', body: 'พี่ครับ submit application Waseda แล้ว', sentAt: '2025-01-14T10:00:00Z' },
      { dir: 'out', body: 'เยี่ยม! interview Nov 12 เตรียมตัวยังไงดี ส่ง mock interview Q&A ไปให้นะคะ', sentAt: '2025-01-14T11:00:00Z', agentId: a1 },
    ],
    'Ua1b2c3d4': [
      { dir: 'in', body: 'Hi! Asked about Group of Eight ranking — Monash vs ANU?', sentAt: '2025-01-17T01:40:00Z' },
      { dir: 'out', body: 'Both are Go8 — Monash stronger for Engineering, ANU stronger for research. ส่ง comparison sheet นะคะ', sentAt: '2025-01-17T01:55:00Z', agentId: a1 },
    ],
    'Ub5c6d7e8': [
      { dir: 'in', body: 'I want to study in USA', sentAt: '2025-01-10T14:00:00Z' },
      { dir: 'in', body: 'Hello? Are you there?', sentAt: '2025-01-14T22:00:00Z' },
    ],
    'Uf3g4h5i6': [
      { dir: 'in', body: 'พี่ครับ ส่ง personal statement ฉบับใหม่ครับ', sentAt: '2025-01-16T19:00:00Z' },
      { dir: 'in', body: 'รบกวนช่วยดูให้หน่อยนะครับ', sentAt: '2025-01-16T20:00:00Z' },
      { dir: 'out', body: 'รับเรียบร้อยค่ะ จะส่ง feedback ภายในพรุ่งนี้ น่าจะเสร็จก่อนเที่ยงค่ะ', sentAt: '2025-01-16T20:30:00Z', agentId: a3 },
    ],
    'Uj7k8l9m0': [
      { dir: 'in', body: 'NTU ADM interview confirmed Jan 23 ค่ะ ตื่นเต้นมาก', sentAt: '2025-01-16T18:00:00Z' },
      { dir: 'out', body: 'ขอ congrats ค่ะ! จัด coaching session online พุธหน้าได้มั้ยคะ?', sentAt: '2025-01-16T18:20:00Z', agentId: a2 },
    ],
    'Un1o2p3q4': [
      { dir: 'in', body: 'พี่ครับ visa application ส่งไปแล้วครับ', sentAt: '2025-01-12T14:00:00Z' },
      { dir: 'out', body: 'เยี่ยมค่ะ! pre-departure briefing Feb 20 จองที่ออฟฟิศไว้แล้วนะคะ', sentAt: '2025-01-12T15:30:00Z', agentId: a1 },
    ],
    'Ur5s6t7u8': [
      { dir: 'in', body: 'Flight booked Feb 24 — ขอบคุณพี่มากๆค่ะที่ช่วยมาตลอด', sentAt: '2025-01-10T11:00:00Z' },
      { dir: 'out', body: 'ยินดีด้วยค่ะ! Monash MBBS journey เริ่มแล้ว safe travels นะคะ 🎓', sentAt: '2025-01-10T11:30:00Z', agentId: a2 },
    ],
    'Uv9w0x1y2': [
      { dir: 'in', body: 'พี่ครับ reference letter ของอาจารย์ยังไม่ได้เลยครับ deadline Friday', sentAt: '2025-01-14T08:00:00Z' },
      { dir: 'out', body: 'ติดต่อด่วนนะคะ ลอง email อาจารย์อีกครั้งวันนี้ ถ้าไม่ได้ มี backup option ค่ะ', sentAt: '2025-01-14T08:45:00Z', agentId: a3 },
    ],
  };

  for (const [lineUserId, messages] of Object.entries(messageData)) {
    const customer = await prisma.customer.findUnique({ where: { lineUserId } });
    if (!customer) continue;

    const existingCount = await prisma.message.count({ where: { customerId: customer.id } });
    if (existingCount > 0) continue;

    for (const m of messages) {
      await prisma.message.create({
        data: {
          customerId: customer.id,
          direction: m.dir,
          body: m.body,
          sentAt: new Date(m.sentAt),
          agentId: m.agentId ?? null,
        },
      });
    }
  }

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
