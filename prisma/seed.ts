/**
 * Seeds the curated subject/level taxonomy and a set of demo accounts.
 *
 * Safe to re-run: reference data is upserted, and demo accounts are keyed on
 * email so a second run refreshes rather than duplicates them.
 *
 * Every demo account uses the password below. It exists so the app can be tried
 * out immediately — do not seed demo data into a production database.
 */
import { PrismaClient, type DeliveryMode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "password123";

const LEVELS = [
  { name: "Key Stage 1", slug: "ks1", sortOrder: 10 },
  { name: "Key Stage 2", slug: "ks2", sortOrder: 20 },
  { name: "Key Stage 3", slug: "ks3", sortOrder: 30 },
  { name: "GCSE", slug: "gcse", sortOrder: 40 },
  { name: "A-Level", slug: "a-level", sortOrder: 50 },
  { name: "Undergraduate", slug: "undergraduate", sortOrder: 60 },
  { name: "Adult learner", slug: "adult", sortOrder: 70 },
];

const SUBJECTS = [
  ["Mathematics", "maths", "Maths & Sciences"],
  ["Further Mathematics", "further-maths", "Maths & Sciences"],
  ["Biology", "biology", "Maths & Sciences"],
  ["Chemistry", "chemistry", "Maths & Sciences"],
  ["Physics", "physics", "Maths & Sciences"],
  ["Combined Science", "combined-science", "Maths & Sciences"],
  ["English Language", "english-language", "English & Humanities"],
  ["English Literature", "english-literature", "English & Humanities"],
  ["History", "history", "English & Humanities"],
  ["Geography", "geography", "English & Humanities"],
  ["Religious Studies", "religious-studies", "English & Humanities"],
  ["Philosophy", "philosophy", "English & Humanities"],
  ["French", "french", "Languages"],
  ["German", "german", "Languages"],
  ["Spanish", "spanish", "Languages"],
  ["Latin", "latin", "Languages"],
  ["Mandarin", "mandarin", "Languages"],
  ["English as a Second Language", "esl", "Languages"],
  ["Psychology", "psychology", "Social Sciences"],
  ["Sociology", "sociology", "Social Sciences"],
  ["Economics", "economics", "Social Sciences"],
  ["Business Studies", "business-studies", "Social Sciences"],
  ["Politics", "politics", "Social Sciences"],
  ["Computer Science", "computer-science", "Computing & Technology"],
  ["Design & Technology", "design-technology", "Computing & Technology"],
  ["Art & Design", "art-design", "Creative & Performing Arts"],
  ["Music", "music", "Creative & Performing Arts"],
  ["Music Theory", "music-theory", "Creative & Performing Arts"],
  ["Drama", "drama", "Creative & Performing Arts"],
  ["11 Plus", "eleven-plus", "Entrance & Admissions"],
  ["Common Entrance", "common-entrance", "Entrance & Admissions"],
  ["UCAT", "ucat", "Entrance & Admissions"],
  ["LNAT", "lnat", "Entrance & Admissions"],
  ["IELTS", "ielts", "Entrance & Admissions"],
  ["Study Skills", "study-skills", "Entrance & Admissions"],
] as const;

/**
 * Demo tutors.
 *
 * The latitude/longitude values are approximate district centres, hard-coded so
 * that seeding works without network access to the postcode geocoder. Profiles
 * created through the app are geocoded properly from the postcode on save.
 */
const TUTORS = [
  {
    email: "priya@example.com",
    name: "Priya Raman",
    headline: "A-Level Maths and Physics, exam-board focused",
    bio: "Fifteen years teaching Maths and Physics in south London, most recently as head of sixth-form Physics. I work through past papers with students and concentrate on the marks people routinely drop: units, significant figures and the 'explain' questions. I teach Edexcel, AQA and OCR specifications.",
    hourlyRatePence: 4500,
    postcode: "SE1 9RT",
    latitude: 51.5045,
    longitude: -0.0865,
    travelRadiusMiles: 6,
    yearsExperience: 15,
    qualifications: "MSci Physics (Imperial College London), PGCE, QTS",
    verified: true,
    dbs: "001234567890",
    offersOnline: true,
    offersInPerson: true,
    subjects: [["maths", ["gcse", "a-level"]], ["physics", ["gcse", "a-level"]], ["further-maths", ["a-level"]]],
    availability: [[2, "16:00", "20:00"], [4, "16:00", "20:00"], [6, "09:00", "13:00"]],
  },
  {
    email: "tom@example.com",
    name: "Tom Whitfield",
    headline: "English Literature and Language — essay technique",
    bio: "I help students who can talk brilliantly about a text but freeze when they have to write it down. Sessions are built around planning, structuring and redrafting a single essay until the method sticks. Happy to work on coursework as well as exam preparation.",
    hourlyRatePence: 3800,
    postcode: "N1 8AA",
    latitude: 51.5362,
    longitude: -0.1033,
    travelRadiusMiles: 5,
    yearsExperience: 8,
    qualifications: "BA English (Durham), MA Modern Literature (UCL)",
    verified: true,
    dbs: "001234567891",
    offersOnline: true,
    offersInPerson: true,
    subjects: [["english-literature", ["gcse", "a-level"]], ["english-language", ["ks3", "gcse"]]],
    availability: [[1, "17:00", "21:00"], [3, "17:00", "21:00"], [0, "10:00", "14:00"]],
  },
  {
    email: "aisha@example.com",
    name: "Aisha Bello",
    headline: "Chemistry and Biology, GCSE to A-Level",
    bio: "Former NHS biomedical scientist, now tutoring full time. I lean on real laboratory examples because they make the theory stick, and I set short weekly consolidation tasks between sessions rather than long ones.",
    hourlyRatePence: 4200,
    postcode: "E14 5AB",
    latitude: 51.5054,
    longitude: -0.0235,
    travelRadiusMiles: 8,
    yearsExperience: 6,
    qualifications: "BSc Biomedical Science, MSc Clinical Biochemistry",
    verified: true,
    dbs: "001234567892",
    offersOnline: true,
    offersInPerson: true,
    subjects: [["chemistry", ["gcse", "a-level"]], ["biology", ["gcse", "a-level"]], ["combined-science", ["gcse"]]],
    availability: [[2, "18:00", "21:00"], [5, "16:00", "19:00"], [6, "10:00", "16:00"]],
  },
  {
    email: "daniel@example.com",
    name: "Daniel Okoro",
    headline: "Computer Science and Maths — code, not just theory",
    bio: "Software engineer tutoring evenings. Students write and debug real code every session; the specification content lands much faster that way. Comfortable with Python, Java and the NEA project write-up.",
    hourlyRatePence: 5000,
    postcode: "SW11 1AA",
    latitude: 51.467,
    longitude: -0.165,
    travelRadiusMiles: 4,
    yearsExperience: 4,
    qualifications: "BSc Computer Science (Southampton)",
    verified: false,
    dbs: null,
    offersOnline: true,
    offersInPerson: false,
    subjects: [["computer-science", ["gcse", "a-level"]], ["maths", ["ks3", "gcse"]]],
    availability: [[1, "19:00", "22:00"], [3, "19:00", "22:00"], [4, "19:00", "22:00"]],
  },
  {
    email: "helen@example.com",
    name: "Helen Carr",
    headline: "Latin and Classics, beginners to A-Level",
    bio: "Twenty years of Latin teaching, including preparing candidates for Common Entrance and Oxbridge classics interviews. Patient with absolute beginners — we start with the alphabet and word order if that is where you are.",
    hourlyRatePence: 4800,
    postcode: "CB1 1AA",
    latitude: 52.199,
    longitude: 0.14,
    travelRadiusMiles: 10,
    yearsExperience: 20,
    qualifications: "MA Classics (Cambridge), PGCE",
    verified: true,
    dbs: "001234567893",
    offersOnline: true,
    offersInPerson: true,
    subjects: [["latin", ["ks3", "gcse", "a-level"]], ["common-entrance", ["ks2", "ks3"]]],
    availability: [[1, "14:00", "18:00"], [2, "14:00", "18:00"], [4, "14:00", "18:00"]],
  },
  {
    email: "marcus@example.com",
    name: "Marcus Leigh",
    headline: "Music and music theory, ABRSM grades 1–8",
    bio: "Working session musician and peripatetic teacher. Theory lessons are practical: we analyse music you actually listen to. I also prepare students for aural tests, which are the part most people leave until the week before.",
    hourlyRatePence: 3500,
    postcode: "M20 2RN",
    latitude: 53.42,
    longitude: -2.23,
    travelRadiusMiles: 7,
    yearsExperience: 12,
    qualifications: "BMus (Royal Northern College of Music)",
    verified: true,
    dbs: "001234567894",
    offersOnline: true,
    offersInPerson: true,
    subjects: [["music", ["ks3", "gcse", "a-level"]], ["music-theory", ["ks2", "ks3", "gcse"]]],
    availability: [[3, "15:00", "20:00"], [5, "15:00", "20:00"], [6, "09:00", "14:00"]],
  },
  {
    email: "sofia@example.com",
    name: "Sofia Marchetti",
    headline: "Spanish and French — speaking confidence first",
    bio: "Native Spanish speaker, near-native French. Half of every lesson is conversation, because the speaking exam is where most marks are won or lost. Also teach adults preparing to move abroad.",
    hourlyRatePence: 4000,
    postcode: "BS8 1TH",
    latitude: 51.456,
    longitude: -2.62,
    travelRadiusMiles: 6,
    yearsExperience: 9,
    qualifications: "Licenciatura en Filología Hispánica, DELE examiner training",
    verified: false,
    dbs: null,
    offersOnline: true,
    offersInPerson: true,
    subjects: [["spanish", ["ks3", "gcse", "a-level", "adult"]], ["french", ["ks3", "gcse"]]],
    availability: [[1, "10:00", "14:00"], [2, "10:00", "14:00"], [4, "17:00", "20:00"]],
  },
  {
    email: "ruth@example.com",
    name: "Ruth Nagi",
    headline: "Psychology and Sociology A-Level",
    bio: "I teach the studies as stories, which makes the evaluation points far easier to recall under exam pressure. Strong focus on the 16-mark essays and on research methods, which students often neglect.",
    hourlyRatePence: 3900,
    postcode: "LS6 3AA",
    latitude: 53.818,
    longitude: -1.575,
    travelRadiusMiles: 5,
    yearsExperience: 7,
    qualifications: "BSc Psychology (Leeds), MSc Research Methods",
    verified: true,
    dbs: "001234567895",
    offersOnline: true,
    offersInPerson: true,
    subjects: [["psychology", ["a-level", "undergraduate"]], ["sociology", ["gcse", "a-level"]]],
    availability: [[2, "16:00", "21:00"], [3, "16:00", "21:00"]],
  },
  {
    email: "james@example.com",
    name: "James Fletcher",
    headline: "Economics and Business Studies, plus admissions prep",
    bio: "Economics graduate and former management consultant. Sessions use current news stories to anchor the diagrams, and I do a lot of work on data-response questions. Also help with personal statements for economics applicants.",
    hourlyRatePence: 5500,
    postcode: "OX2 6AA",
    latitude: 51.762,
    longitude: -1.275,
    travelRadiusMiles: 12,
    yearsExperience: 5,
    qualifications: "BA Philosophy, Politics and Economics (Oxford)",
    verified: false,
    dbs: null,
    offersOnline: true,
    offersInPerson: true,
    subjects: [["economics", ["a-level", "undergraduate"]], ["business-studies", ["gcse", "a-level"]], ["study-skills", ["a-level"]]],
    availability: [[0, "10:00", "16:00"], [6, "10:00", "16:00"]],
  },
  {
    email: "nadia@example.com",
    name: "Nadia Hussain",
    headline: "11 Plus and primary maths, gently paced",
    bio: "Primary teacher of eleven years. I prepare children for grammar-school entrance without turning it into a grind — short sessions, lots of encouragement, and honest feedback to parents about whether the exam is the right fit.",
    hourlyRatePence: 3200,
    postcode: "B15 2TT",
    latitude: 52.465,
    longitude: -1.92,
    travelRadiusMiles: 8,
    yearsExperience: 11,
    qualifications: "BEd Primary Education, QTS",
    verified: true,
    dbs: "001234567896",
    offersOnline: false,
    offersInPerson: true,
    subjects: [["eleven-plus", ["ks2"]], ["maths", ["ks1", "ks2"]], ["english-language", ["ks2"]]],
    availability: [[1, "15:30", "18:30"], [3, "15:30", "18:30"], [6, "09:00", "12:00"]],
  },
] as const;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const level of LEVELS) {
    await prisma.level.upsert({
      where: { slug: level.slug },
      update: { name: level.name, sortOrder: level.sortOrder },
      create: level,
    });
  }

  for (const [name, slug, category] of SUBJECTS) {
    await prisma.subject.upsert({
      where: { slug },
      update: { name, category },
      create: { name, slug, category },
    });
  }
  console.log(`Reference data: ${LEVELS.length} levels, ${SUBJECTS.length} subjects.`);

  const levelBySlug = new Map((await prisma.level.findMany()).map((l) => [l.slug, l.id]));
  const subjectBySlug = new Map((await prisma.subject.findMany()).map((s) => [s.slug, s.id]));

  for (const tutor of TUTORS) {
    const user = await prisma.user.upsert({
      where: { email: tutor.email },
      update: { name: tutor.name, role: "TUTOR" },
      create: { email: tutor.email, name: tutor.name, passwordHash, role: "TUTOR" },
    });

    const profile = await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      update: {
        headline: tutor.headline,
        bio: tutor.bio,
        hourlyRatePence: tutor.hourlyRatePence,
        postcode: tutor.postcode,
        outcode: tutor.postcode.split(" ")[0],
        latitude: tutor.latitude,
        longitude: tutor.longitude,
        travelRadiusMiles: tutor.travelRadiusMiles,
        yearsExperience: tutor.yearsExperience,
        qualifications: tutor.qualifications,
        offersOnline: tutor.offersOnline,
        offersInPerson: tutor.offersInPerson,
        dbsCertificateNumber: tutor.dbs,
        verified: tutor.verified,
        verifiedAt: tutor.verified ? new Date() : null,
        published: true,
      },
      create: {
        userId: user.id,
        headline: tutor.headline,
        bio: tutor.bio,
        hourlyRatePence: tutor.hourlyRatePence,
        postcode: tutor.postcode,
        outcode: tutor.postcode.split(" ")[0],
        latitude: tutor.latitude,
        longitude: tutor.longitude,
        travelRadiusMiles: tutor.travelRadiusMiles,
        yearsExperience: tutor.yearsExperience,
        qualifications: tutor.qualifications,
        offersOnline: tutor.offersOnline,
        offersInPerson: tutor.offersInPerson,
        dbsCertificateNumber: tutor.dbs,
        verified: tutor.verified,
        verifiedAt: tutor.verified ? new Date() : null,
        published: true,
      },
    });

    // Replace rather than merge, so re-seeding is idempotent.
    await prisma.tutorSubject.deleteMany({ where: { tutorProfileId: profile.id } });
    await prisma.availabilityRule.deleteMany({ where: { tutorProfileId: profile.id } });

    for (const [subjectSlug, levelSlugs] of tutor.subjects) {
      const subjectId = subjectBySlug.get(subjectSlug);
      if (!subjectId) throw new Error(`Unknown subject slug in seed: ${subjectSlug}`);
      for (const levelSlug of levelSlugs) {
        const levelId = levelBySlug.get(levelSlug);
        if (!levelId) throw new Error(`Unknown level slug in seed: ${levelSlug}`);
        await prisma.tutorSubject.create({ data: { tutorProfileId: profile.id, subjectId, levelId } });
      }
    }

    for (const [weekday, from, to] of tutor.availability) {
      await prisma.availabilityRule.create({
        data: {
          tutorProfileId: profile.id,
          weekday,
          startMinute: toMinutes(from),
          endMinute: toMinutes(to),
        },
      });
    }
  }
  console.log(`Demo tutors: ${TUTORS.length}.`);

  const parent = await prisma.user.upsert({
    where: { email: "parent@example.com" },
    update: { name: "Sam Docherty", role: "SEEKER" },
    create: {
      email: "parent@example.com",
      name: "Sam Docherty",
      passwordHash,
      role: "SEEKER",
      phone: "07700 900123",
    },
  });

  if ((await prisma.student.count({ where: { ownerId: parent.id } })) === 0) {
    await prisma.student.createMany({
      data: [
        { ownerId: parent.id, name: "Ellie", yearGroup: "Year 11" },
        { ownerId: parent.id, name: "Joe", yearGroup: "Year 8" },
      ],
    });
  }

  await prisma.user.upsert({
    where: { email: "learner@example.com" },
    update: { name: "Alex Reid", role: "SEEKER" },
    create: { email: "learner@example.com", name: "Alex Reid", passwordHash, role: "SEEKER" },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { role: "ADMIN" },
    create: { email: "admin@example.com", name: "Site Admin", passwordHash, role: "ADMIN" },
  });

  // Pre-populate the postcode cache with the demo tutors' own postcodes, using
  // the same approximate coordinates as above. This lets you search by one of
  // these postcodes straight away, including with no network access to
  // postcodes.io. Real lookups are cached here automatically as people search.
  for (const tutor of TUTORS) {
    await prisma.postcodeLookup.upsert({
      where: { postcode: tutor.postcode },
      update: { latitude: tutor.latitude, longitude: tutor.longitude },
      create: {
        postcode: tutor.postcode,
        latitude: tutor.latitude,
        longitude: tutor.longitude,
      },
    });
  }

  console.log("Demo accounts: parent@example.com, learner@example.com, admin@example.com");
  console.log(`All demo accounts use the password: ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
