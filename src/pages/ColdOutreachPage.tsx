// @ts-nocheck
import { useState } from "react";

const C = {
  bg: "#070c18",
  card: "#0d1424",
  card2: "#111827",
  border: "#1a2540",
  blue: "#2563eb",
  blueL: "#3b82f6",
  blueDim: "#0f1e42",
  green: "#059669",
  greenL: "#10b981",
  greenDim: "#052e1c",
  red: "#dc2626",
  redDim: "#3b0a0a",
  orange: "#d97706",
  orangeL: "#f59e0b",
  orangeDim: "#3d1f02",
  purple: "#7c3aed",
  purpleL: "#a78bfa",
  purpleDim: "#1e0d42",
  teal: "#0d9488",
  tealL: "#2dd4bf",
  tealDim: "#042f2e",
  gray: "#374151",
  grayL: "#6b7280",
  text: "#f1f5f9",
  dim: "#94a3b8",
  faint: "#1e293b",
};

const nodes = {
  qualifier: {
    id: "qualifier", phase: "STEP 1", icon: "📱",
    title: "Send Qualifier SMS",
    color: C.blue, dim: C.blueDim,
    instruction: "Before anything, confirm you have the right number. One short message.",
    messages: [{ label: null, text: "hey is this still the right number for [business name]?" }],
    branches: [
      { label: "✅ Yes / Confirmed", next: "screenshot", color: C.green },
      { label: "❌ Wrong number", next: "dead_wrong_number", color: C.red },
      { label: "🔇 No reply after 24 hrs", next: "fu_qualifier", color: C.grayL },
    ]
  },
  screenshot: {
    id: "screenshot", phase: "STEP 2", icon: "🖥️",
    title: "Build the Screenshot",
    color: C.purple, dim: C.purpleDim,
    instruction: "Don't message them again yet. Build the demo first, then send the pitch.",
    actionSteps: [
      "Go to juniesystems.com/screenshot",
      "Enter business name + phone number",
      "Logo: pull from their website or GBP. No logo? → ChatGPT: \"create a logo for [business name]\" → download it",
      "Generate the screenshot and save it before moving on",
    ],
    branches: [{ label: "Screenshot is ready →", next: "pitch", color: C.purple }]
  },
  pitch: {
    id: "pitch", phase: "STEP 3", icon: "🚀",
    title: "Send Pitch + Screenshot",
    color: C.blue, dim: C.blueDim,
    instruction: "Sell the outcome, more booked jobs, fewer leads going to competitors. Never sell features. Always end aimed at the call.",
    messages: [
      { label: "If they HAVE a website (bad one):", text: "what's up my name is ricky, i know this is random and just tell me to kick rocks if it's a waste of your time but the way your site is set up right now is probably costing you jobs every week, people land on it and call your competitors instead, i mocked up what it'd look like fixed so you'd actually start getting those calls" },
      { label: "If they have NO website:", text: "what's up my name is ricky, i know this is random and just tell me to kick rocks if it's a waste of your time but without a site you're losing the customers who google you before they call, they just dial whoever shows up first, i mocked one up so those jobs start landing in your phone instead of your competitors'" }
    ],
    branches: [
      { label: "Interested / Curious / Any question", next: "push_to_book", color: C.green },
      { label: "\"What's the catch?\"", next: "obj_catch", color: C.orange },
      { label: "\"How much does it cost?\"", next: "obj_cost", color: C.orange },
      { label: "\"I already have a website\"", next: "obj_have_site", color: C.orange },
      { label: "\"Who are you?\"", next: "obj_who", color: C.orange },
      { label: "\"Just send me more info\"", next: "obj_info", color: C.orange },
      { label: "\"Are you a bot?\"", next: "obj_bot", color: C.orange },
      { label: "\"No time right now\"", next: "obj_time", color: C.orange },
      { label: "\"What do you do exactly?\"", next: "obj_what", color: C.orange },
      { label: "\"Not interested\"", next: "obj_no", color: C.red },
      { label: "🔇 No reply after 48 hrs", next: "fu_pitch_1", color: C.grayL },
    ]
  },
  push_to_book: {
    id: "push_to_book", phase: "STEP 4", icon: "📅",
    title: "Push to Book: VA Picks the Times",
    color: C.teal, dim: C.tealDim,
    instruction: "Sell the outcome of the call, what they walk away with, then offer two specific times. Yes/no decision, not an open question.",
    vaAction: "Open Ricky's calendar right now. Find two open slots this week or early next. Use those specific times in the message below.",
    messages: [
      { label: "Offer two specific times:", text: "awesome. 20 min on the phone and you'll see exactly how many jobs you're missing right now and what it'd take to start landing them, i've got tuesday at 10am or thursday at 2pm open, either work for you?" },
      { label: "If they ask \"when works for you?\":", text: "i've got tuesday at 10 or thursday at 2, which one's better? worst case you walk away with a clearer picture of where leads are leaking" }
    ],
    branches: [
      { label: "They pick a time / say yes", next: "book_confirmed", color: C.green },
      { label: "Neither time works", next: "book_reschedule", color: C.orange },
      { label: "🔇 No reply after 24 hrs", next: "fu_booking_ghost", color: C.grayL },
    ]
  },
  book_reschedule: {
    id: "book_reschedule", phase: "BOOKING", icon: "🔄",
    title: "Neither Time Works: Offer More",
    color: C.teal, dim: C.tealDim,
    instruction: "Pull two more open slots from Ricky's calendar. Keep offering specific times, don't hand it back to them to figure out.",
    vaAction: "Check Ricky's calendar again. Find 2 more open slots and offer those.",
    messages: [{ label: null, text: "no worries, i also have [day] at [time] or [day] at [time], any of those work?" }],
    branches: [
      { label: "They pick one", next: "book_confirmed", color: C.green },
      { label: "🔇 Still no commitment after 24 hrs", next: "fu_booking_ghost", color: C.grayL },
    ]
  },
  book_confirmed: {
    id: "book_confirmed", phase: "🎯 GOAL", icon: "🎉",
    title: "Call Booked",
    color: C.green, dim: C.greenDim,
    isGoal: true,
    instruction: "Confirm the time back to them, add it to Ricky's calendar manually, then log it.",
    messages: [{ label: "Confirm with them:", text: "perfect, locked in for [day] at [time], you'll get a confirmation, lmk if anything changes." }],
    postSteps: [
      "Add to Ricky's calendar: prospect name, number, and time",
      "Log the booking in GHL with a note",
      "Move contact to 'Call Booked' pipeline stage",
      "Tag contact: call-booked",
    ],
    branches: []
  },
  obj_catch: {
    id: "obj_catch", phase: "OBJECTION", icon: "🪝",
    title: "\"What's the catch?\"",
    color: C.orange, dim: C.orangeDim,
    messages: [{ label: null, text: "no catch, i build these because most contractors don't realize how many jobs they're losing every week before they ever pick up the phone, show you on the call, you decide if it's worth fixing, no pressure either way, tuesday at 10am or thursday at 2pm?" }],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Curious but noncommittal", next: "push_to_book", color: C.teal },
      { label: "🔇 No reply after 24 hrs", next: "fu_obj_ghost", color: C.grayL },
    ]
  },
  obj_cost: {
    id: "obj_cost", phase: "OBJECTION", icon: "💰",
    title: "\"How much does it cost?\"",
    color: C.orange, dim: C.orangeDim,
    messages: [{ label: null, text: "honestly the cost matters way less than what you're losing right now in missed jobs every month, on the call i'll show you exactly where the leads are leaking and what it'd take to plug it, then pricing makes sense in context, tuesday at 10 or thursday at 2?" }],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Still wants to talk more first", next: "push_to_book", color: C.teal },
      { label: "🔇 No reply after 24 hrs", next: "fu_obj_ghost", color: C.grayL },
    ]
  },
  obj_have_site: {
    id: "obj_have_site", phase: "OBJECTION", icon: "🌐",
    title: "\"I already have a website\"",
    color: C.orange, dim: C.orangeDim,
    messages: [{ label: null, text: "totally get it, most contractors do, the question isn't whether you have a site, it's whether it's actually turning visitors into booked jobs. 20 min and i'll show you what yours is doing vs what it could be, tuesday at 10am or thursday at 2pm?" }],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Open to it but noncommittal", next: "push_to_book", color: C.teal },
      { label: "Hard no", next: "obj_no", color: C.red },
      { label: "🔇 No reply after 24 hrs", next: "fu_obj_ghost", color: C.grayL },
    ]
  },
  obj_who: {
    id: "obj_who", phase: "OBJECTION", icon: "🤔",
    title: "\"Who are you?\"",
    color: C.orange, dim: C.orangeDim,
    messages: [{ label: null, text: "i'm ricky, i help home service guys stop losing jobs to competitors who just happen to show up better online, saw a few things on your end that are probably costing you calls every week and figured it was worth a heads up. 20 min on the phone i'll walk you through it, tuesday at 10 or thursday at 2?" }],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Open to it", next: "push_to_book", color: C.teal },
      { label: "🔇 No reply after 24 hrs", next: "fu_obj_ghost", color: C.grayL },
    ]
  },
  obj_info: {
    id: "obj_info", phase: "OBJECTION", icon: "📋",
    title: "\"Just send me more info\"",
    color: C.orange, dim: C.orangeDim,
    messages: [{ label: null, text: "i could but a doc isn't gonna show you what you're actually losing every week, that's the whole point of the call. 20 min, you walk away knowing exactly where jobs are leaking, tuesday at 10am or thursday at 2pm?" }],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Still pushing for info before committing", next: "obj_info_persist", color: C.orange },
      { label: "🔇 No reply after 24 hrs", next: "fu_obj_ghost", color: C.grayL },
    ]
  },
  obj_info_persist: {
    id: "obj_info_persist", phase: "OBJECTION", icon: "📋",
    title: "Pushing for info: give a little, then push again",
    color: C.orange, dim: C.orangeDim,
    messages: [{ label: null, text: "fair, short version: most contractors are losing 5-15 jobs a month they don't even know about, missed calls, leads that never get a follow up, customers that bounce off the site, we plug those holes so you keep the work that's already coming your way, the call is just to show you where it's happening for you specifically, tuesday at 10 or thursday at 2?" }],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "🔇 Gone quiet", next: "fu_obj_ghost", color: C.grayL },
    ]
  },
  obj_bot: {
    id: "obj_bot", phase: "OBJECTION", icon: "🤖",
    title: "\"Are you a bot?\"",
    color: C.orange, dim: C.orangeDim,
    messages: [{ label: null, text: "nah this is actually me lol, i look at contractor sites in the area, and when i see one that's costing the owner real jobs i reach out. 20 min on the phone i'll show you what i mean, tuesday at 10 or thursday at 2?" }],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Open to it", next: "push_to_book", color: C.teal },
      { label: "🔇 No reply after 24 hrs", next: "fu_obj_ghost", color: C.grayL },
    ]
  },
  obj_time: {
    id: "obj_time", phase: "OBJECTION", icon: "⏰",
    title: "\"No time right now\"",
    color: C.orange, dim: C.orangeDim,
    messages: [{ label: null, text: "totally fair, every week you wait though is more jobs going to your competitors. 20 min is all it takes to see what's actually leaking, tuesday at 10am or thursday at 2pm work? if not just tell me when's better." }],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "They give a future window (\"next week\", \"after friday\")", next: "fu_time_future", color: C.teal },
      { label: "🔇 No reply after 24 hrs", next: "fu_obj_ghost", color: C.grayL },
    ]
  },
  obj_what: {
    id: "obj_what", phase: "OBJECTION", icon: "❓",
    title: "\"What do you do exactly?\"",
    color: C.orange, dim: C.orangeDim,
    messages: [{ label: null, text: "short version: i help home service guys land the jobs they're already losing, missed calls that never call back, leads that ghost, customers that bounce off the site, on a 20 min call i'll show you specifically where it's happening in your business, tuesday at 10 or thursday at 2?" }],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Still engaged, more questions", next: "push_to_book", color: C.teal },
      { label: "🔇 No reply after 24 hrs", next: "fu_obj_ghost", color: C.grayL },
    ]
  },
  obj_no: {
    id: "obj_no", phase: "OBJECTION", icon: "🚫",
    title: "\"Not interested\"",
    color: C.red, dim: C.redDim,
    messages: [{ label: null, text: "totally fair, appreciate you replying, if anything ever changes just shoot me a text, good luck out there." }],
    branches: [{ label: "Log and close →", next: "dead_not_interested", color: C.grayL }]
  },
  fu_qualifier: {
    id: "fu_qualifier", phase: "FOLLOW-UP", icon: "🔇",
    title: "Ghost After Qualifier",
    color: C.grayL, dim: C.faint,
    instruction: "They never replied to the qualifier. One follow-up, then move on.",
    sequence: [
      { day: "Day 2", label: "FU #1 (last one)", text: "hey just making sure this got through, is this still the right number for [business name]?" },
    ],
    note: "If no reply after this, log and move on. Do not send a third message.",
    branches: [
      { label: "They reply → confirmed", next: "screenshot", color: C.green },
      { label: "🔇 Still no reply → done", next: "dead_no_reply", color: C.grayL },
    ]
  },
  fu_pitch_1: {
    id: "fu_pitch_1", phase: "FOLLOW-UP", icon: "🔇",
    title: "Ghost After Pitch: Day 3",
    color: C.grayL, dim: C.faint,
    instruction: "They didn't reply to the pitch. Soft nudge, keep it casual.",
    sequence: [
      { day: "Day 3", label: "FU #1", text: "hey just wanted to make sure you saw the site i built, lmk what you think" },
    ],
    branches: [
      { label: "They reply with interest", next: "push_to_book", color: C.teal },
      { label: "🔇 No reply after 48 more hrs", next: "fu_pitch_2", color: C.grayL },
    ]
  },
  fu_pitch_2: {
    id: "fu_pitch_2", phase: "FOLLOW-UP", icon: "🔇",
    title: "Ghost After Pitch: Day 6 (Final)",
    color: C.grayL, dim: C.faint,
    instruction: "Last follow-up. Offer two times directly, make it as easy as possible to say yes.",
    sequence: [
      { day: "Day 6", label: "FU #2 (final)", text: "20 min on the phone you'll see exactly how many jobs you're losing right now and what it'd take to keep them, tuesday at 10am or thursday at 2pm, either one work?" },
    ],
    note: "If no reply after this, log and close. No more messages.",
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Any other reply", next: "push_to_book", color: C.teal },
      { label: "🔇 Still no reply → done", next: "dead_no_reply", color: C.grayL },
    ]
  },
  fu_booking_ghost: {
    id: "fu_booking_ghost", phase: "FOLLOW-UP", icon: "🔇",
    title: "Ghost After Booking Attempt",
    color: C.grayL, dim: C.faint,
    instruction: "They were engaged, you offered specific times, they disappeared. Two follow-ups, both with specific times offered.",
    sequence: [
      { day: "Day 2", label: "FU #1", text: "hey still got tuesday at 10 or thursday at 2 open. 20 min and you'll know exactly where jobs are leaking, just need a yes or no" },
      { day: "Day 5", label: "FU #2 (final)", text: "last time i'll bug you, if timing ever works just text me and we'll set something up, good luck out there." },
    ],
    note: "After FU #2 with no reply, log and close. Do not send more.",
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Any engaged reply", next: "push_to_book", color: C.teal },
      { label: "🔇 No reply after FU #2 → done", next: "dead_fade", color: C.grayL },
    ]
  },
  fu_obj_ghost: {
    id: "fu_obj_ghost", phase: "FOLLOW-UP", icon: "🔇",
    title: "Ghost After Objection Reply",
    color: C.grayL, dim: C.faint,
    instruction: "They replied with an objection, you handled it with two specific times, they went quiet. One more nudge, then one final close.",
    sequence: [
      { day: "Day 2", label: "FU #1", text: "hey just circling back, every week without this fixed is more work going to your competitors, tuesday at 10am or thursday at 2pm still open, takes 20 min." },
      { day: "Day 5", label: "FU #2 (final)", text: "no worries if the timing's off, if you ever want to revisit just text me, good luck out there." },
    ],
    note: "No reply after FU #2 = log as 'ghosted after objection' and close.",
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "Any engaged reply", next: "push_to_book", color: C.teal },
      { label: "🔇 No reply after FU #2 → done", next: "dead_fade", color: C.grayL },
    ]
  },
  fu_time_future: {
    id: "fu_time_future", phase: "FOLLOW-UP", icon: "📆",
    title: "\"Reach me later\". Circle Back",
    color: C.teal, dim: C.tealDim,
    instruction: "Set a GHL task for the date/window they mentioned. When it comes, send this with two fresh times from Ricky's calendar.",
    vaAction: "Set a GHL task reminder for when they said to reach back. Check Ricky's calendar then and offer two real open slots.",
    sequence: [
      { day: "On their date", label: "Circle back", text: "hey ricky here, you mentioned this week might be better, i've got [day] at [time] or [day] at [time] open, either of those work?" },
    ],
    branches: [
      { label: "They pick a time", next: "book_confirmed", color: C.green },
      { label: "🔇 Still no reply → done", next: "dead_fade", color: C.grayL },
    ]
  },
  dead_no_reply: {
    id: "dead_no_reply", phase: "CLOSED", icon: "🗂️",
    title: "No Reply: Closed",
    color: C.grayL, dim: C.faint, isDead: true,
    closeSteps: ["Log as 'no response' in GHL", "Tag: no-reply", "Move to 'Dead' pipeline stage", "Next lead"],
    branches: []
  },
  dead_not_interested: {
    id: "dead_not_interested", phase: "CLOSED", icon: "🗂️",
    title: "Not Interested: Closed",
    color: C.grayL, dim: C.faint, isDead: true,
    closeSteps: ["Log the conversation in GHL", "Tag: not-interested", "Move to 'Dead' pipeline stage", "Next lead"],
    branches: []
  },
  dead_wrong_number: {
    id: "dead_wrong_number", phase: "CLOSED", icon: "❌",
    title: "Wrong Number",
    color: C.red, dim: C.redDim, isDead: true,
    closeSteps: ["Log as 'wrong number' in GHL", "Remove from lead list entirely", "Next lead"],
    branches: []
  },
  dead_fade: {
    id: "dead_fade", phase: "CLOSED", icon: "🗂️",
    title: "Faded Out: Closed",
    color: C.grayL, dim: C.faint, isDead: true,
    closeSteps: ["Log conversation summary in GHL", "Tag: faded", "Move to 'Dead' pipeline stage", "Next lead"],
    branches: []
  },
};

function SMSBubble({ text, label }) {
  return (
    <div style={{ marginTop: 10 }}>
      {label && <div style={{ fontSize: 10, color: C.dim, marginBottom: 5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>}
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", borderRadius: "16px 16px 3px 16px", padding: "11px 15px", fontSize: 13.5, color: "#fff", lineHeight: 1.6, fontStyle: "italic", boxShadow: "0 2px 14px #2563eb33" }}>
        {text}
      </div>
    </div>
  );
}

function SequenceStep({ step }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
      <div style={{ minWidth: 68, fontSize: 10, fontWeight: 700, color: C.orangeL, background: C.orangeDim, border: `1px solid ${C.orange}44`, borderRadius: 6, padding: "3px 7px", textAlign: "center", marginTop: 2, whiteSpace: "nowrap" }}>
        {step.day}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{step.label}</div>
        <div style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", borderRadius: "14px 14px 3px 14px", padding: "9px 13px", fontSize: 13, color: "#fff", lineHeight: 1.55, fontStyle: "italic", boxShadow: "0 2px 8px #2563eb22" }}>
          {step.text}
        </div>
      </div>
    </div>
  );
}

function VABox({ text }) {
  return (
    <div style={{ background: "#080f1f", border: `1px solid ${C.blue}44`, borderRadius: 10, padding: "10px 14px", marginTop: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 16, marginTop: 1 }}>👤</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.blueL, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>VA action</div>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}

function NoteBox({ text }) {
  return (
    <div style={{ background: "#110900", border: `1px solid ${C.orange}33`, borderRadius: 10, padding: "9px 13px", marginTop: 10, fontSize: 12, color: C.orangeL, lineHeight: 1.5 }}>
      ⚠️ {text}
    </div>
  );
}

function NodeCard({ node, onNavigate }) {
  const isGoal = node.isGoal;
  const isDead = node.isDead;
  const isFU = node.id.startsWith("fu_");
  return (
    <div style={{ background: C.card, border: `1.5px solid ${node.color}33`, borderRadius: 18, overflow: "hidden", boxShadow: isGoal ? `0 0 48px ${C.green}28` : `0 0 20px ${node.color}12`, maxWidth: 580, width: "100%" }}>
      <div style={{ background: isGoal ? `linear-gradient(135deg,${C.greenDim},#083320)` : isDead ? "linear-gradient(135deg,#0d0d0d,#111)" : `linear-gradient(135deg,${node.dim},${node.color}1a)`, borderBottom: `1px solid ${node.color}30`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 26 }}>{node.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: node.color, letterSpacing: "0.12em", textTransform: "uppercase" }}>{node.phase}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{node.title}</div>
        </div>
        {isGoal && <div style={{ background: C.green, borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 800, color: "#fff" }}>🎯 BOOKED</div>}
        {isFU && <div style={{ background: C.faint, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: C.dim }}>FOLLOW-UP</div>}
      </div>
      <div style={{ padding: "16px 20px" }}>
        {node.instruction && (
          <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6, marginBottom: 10, borderLeft: `3px solid ${node.color}55`, paddingLeft: 10 }}>
            {node.instruction}
          </div>
        )}
        {node.vaAction && <VABox text={node.vaAction} />}
        {node.actionSteps && (
          <div style={{ marginTop: 10 }}>
            {node.actionSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <div style={{ minWidth: 22, height: 22, borderRadius: "50%", background: C.purple, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5, paddingTop: 2 }}>{s}</div>
              </div>
            ))}
          </div>
        )}
        {node.messages && node.messages.map((m, i) => <SMSBubble key={i} text={m.text} label={m.label} />)}
        {node.sequence && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Sequence:</div>
            {node.sequence.map((s, i) => <SequenceStep key={i} step={s} />)}
          </div>
        )}
        {node.note && <NoteBox text={node.note} />}
        {node.postSteps && (
          <div style={{ marginTop: 14, background: "#06120d", border: `1px solid ${C.green}33`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.greenL, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>After booking, do this:</div>
            {node.postSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 12, color: C.dim }}>
                <span style={{ color: C.greenL }}>✓</span> {s}
              </div>
            ))}
          </div>
        )}
        {node.closeSteps && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.grayL, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Before moving on:</div>
            {node.closeSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: C.greenL, fontSize: 13 }}>✓</span>
                <span style={{ fontSize: 13, color: C.dim, lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}
          </div>
        )}
        {node.branches && node.branches.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              {node.sequence ? "After sending, they respond with:" : "They respond with:"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {node.branches.map((b, i) => (
                <button key={i} onClick={() => onNavigate(b.next)}
                  style={{ background: `${b.color}12`, border: `1.5px solid ${b.color}40`, borderRadius: 10, padding: "10px 14px", color: b.color, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${b.color}25`; e.currentTarget.style.borderColor = b.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${b.color}12`; e.currentTarget.style.borderColor = `${b.color}40`; }}
                >
                  <span>{b.label}</span>
                  <span style={{ opacity: 0.5 }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {isGoal && <div style={{ marginTop: 18, textAlign: "center" }}><div style={{ fontSize: 22, marginBottom: 6 }}>🎉</div><div style={{ fontSize: 14, fontWeight: 800, color: C.greenL }}>That's the job. Call is on the calendar.</div></div>}
        {isDead && <div style={{ marginTop: 12, textAlign: "center", padding: "8px 0" }}><div style={{ fontSize: 12, color: C.grayL }}>Path closed. Move to the next lead.</div></div>}
      </div>
    </div>
  );
}

function Breadcrumb({ history, onJump }) {
  if (history.length <= 1) return null;
  const L = { qualifier:"Qualifier",screenshot:"Screenshot",pitch:"Pitch",push_to_book:"Offer Times",book_reschedule:"Reschedule",book_confirmed:"Booked ✓",obj_catch:"Catch?",obj_cost:"Cost?",obj_have_site:"Has Site",obj_who:"Who?",obj_info:"Send Info",obj_info_persist:"Info x2",obj_bot:"Bot?",obj_time:"No Time",obj_what:"What Do You Do",obj_no:"Not Interested",fu_qualifier:"FU: Qualifier",fu_pitch_1:"FU: Pitch #1",fu_pitch_2:"FU: Pitch #2",fu_booking_ghost:"FU: Booking",fu_obj_ghost:"FU: Objection",fu_time_future:"Circle Back",dead_no_reply:"Closed",dead_not_interested:"Closed",dead_wrong_number:"Wrong #",dead_fade:"Closed" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 18 }}>
      {history.map((id, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button onClick={() => i < history.length - 1 && onJump(i)}
            style={{ background: i === history.length - 1 ? C.blue : "transparent", border: `1px solid ${i === history.length - 1 ? C.blue : C.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 11, color: i === history.length - 1 ? "#fff" : C.dim, cursor: i === history.length - 1 ? "default" : "pointer", fontWeight: i === history.length - 1 ? 700 : 400 }}>
            {L[id] || id}
          </button>
          {i < history.length - 1 && <span style={{ color: C.faint, fontSize: 13 }}>›</span>}
        </span>
      ))}
    </div>
  );
}

function OverviewMap({ onStart }) {
  const mainFlow = [
    { id:"qualifier",icon:"📱",label:"Qualifier",color:C.blue },
    { id:"screenshot",icon:"🖥️",label:"Screenshot",color:C.purple },
    { id:"pitch",icon:"🚀",label:"Pitch",color:C.blue },
    { id:"push_to_book",icon:"📅",label:"Offer Times",color:C.teal },
    { id:"book_confirmed",icon:"🎉",label:"Call Booked",color:C.green },
  ];
  const objections = [
    {id:"obj_catch",label:"What's the catch?",icon:"🪝"},
    {id:"obj_cost",label:"How much?",icon:"💰"},
    {id:"obj_have_site",label:"I have a site",icon:"🌐"},
    {id:"obj_who",label:"Who are you?",icon:"🤔"},
    {id:"obj_info",label:"Send more info",icon:"📋"},
    {id:"obj_bot",label:"Are you a bot?",icon:"🤖"},
    {id:"obj_time",label:"No time now",icon:"⏰"},
    {id:"obj_what",label:"What do you do?",icon:"❓"},
    {id:"obj_no",label:"Not interested",icon:"🚫"},
  ];
  const followups = [
    {id:"fu_qualifier",label:"Ghost: Qualifier",icon:"🔇"},
    {id:"fu_pitch_1",label:"Ghost: Pitch Day 3",icon:"🔇"},
    {id:"fu_pitch_2",label:"Ghost: Pitch Day 6",icon:"🔇"},
    {id:"fu_booking_ghost",label:"Ghost: After Times Offered",icon:"🔇"},
    {id:"fu_obj_ghost",label:"Ghost: After Objection",icon:"🔇"},
    {id:"fu_time_future",label:"Circle Back (said later)",icon:"📆"},
  ];
  const Btn = ({ item, color }) => (
    <button onClick={() => onStart(item.id)}
      style={{ background:`${color}10`, border:`1px solid ${color}33`, borderRadius:8, padding:"8px 10px", color, fontSize:12, fontWeight:600, cursor:"pointer", textAlign:"left", transition:"all 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.background=`${color}22`; e.currentTarget.style.borderColor=`${color}66`; }}
      onMouseLeave={e => { e.currentTarget.style.background=`${color}10`; e.currentTarget.style.borderColor=`${color}33`; }}
    >
      {item.icon} {item.label}
    </button>
  );
  return (
    <div style={{ maxWidth:680, width:"100%" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:C.blueL, fontWeight:700, marginBottom:8 }}>Junie Systems</div>
        <div style={{ fontSize:26, fontWeight:800, color:C.text, marginBottom:6 }}>Cold Outreach Workflow</div>
        <div style={{ fontSize:13, color:C.dim, maxWidth:420, margin:"0 auto", lineHeight:1.65 }}>
          VA owns the booking, pick the times, offer them, add to calendar. Every path ends at a booked call.
        </div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 16px", marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.blueL, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:14 }}>Main flow</div>
        <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:0, rowGap:10 }}>
          {mainFlow.map((n,i) => (
            <span key={n.id} style={{ display:"flex", alignItems:"center" }}>
              <button onClick={() => onStart(n.id)}
                style={{ background:n.id==="book_confirmed"?C.green:`${n.color}18`, border:`2px solid ${n.color}`, borderRadius:11, padding:"9px 13px", color:n.id==="book_confirmed"?"#fff":n.color, fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"center", minWidth:88, transition:"all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background=`${n.color}35`; e.currentTarget.style.transform="scale(1.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.background=n.id==="book_confirmed"?C.green:`${n.color}18`; e.currentTarget.style.transform="scale(1)"; }}
              >
                <div style={{ fontSize:18, marginBottom:3 }}>{n.icon}</div>
                <div style={{ fontSize:10.5 }}>{n.label}</div>
              </button>
              {i<mainFlow.length-1 && <div style={{ color:C.grayL, fontSize:18, margin:"0 3px", opacity:0.4 }}>→</div>}
            </span>
          ))}
        </div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.orange, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>⚡ Objections, all offer specific times, all route to booking</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))", gap:8 }}>
          {objections.map(o => <Btn key={o.id} item={o} color={C.orange} />)}
        </div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.tealL, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>🔇 Follow-up sequences, for every ghost point</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:8 }}>
          {followups.map(o => <Btn key={o.id} item={o} color={C.tealL} />)}
        </div>
      </div>
      <div style={{ background:"#080f20", border:`1px solid ${C.blue}44`, borderRadius:12, padding:"14px 18px", marginBottom:24 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.blueL, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>👤 The rule: VA books the call, not the customer</div>
        <div style={{ fontSize:12.5, color:C.dim, lineHeight:1.65 }}>
          Never send a calendar link and hope they click it. Check Ricky's calendar, pick two open slots, offer them in the message. It's a yes or no, not a homework assignment. If they say yes, you add it to Ricky's calendar and confirm back.
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <button onClick={() => onStart("qualifier")}
          style={{ background:C.blue, border:"none", borderRadius:12, padding:"13px 34px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:`0 0 28px ${C.blue}44`, transition:"all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background=C.blueL; e.currentTarget.style.transform="scale(1.03)"; }}
          onMouseLeave={e => { e.currentTarget.style.background=C.blue; e.currentTarget.style.transform="scale(1)"; }}
        >
          Start from the beginning →
        </button>
      </div>
    </div>
  );
}

export default function ColdOutreachPage() {
  const [history, setHistory] = useState<string[]>([]);
  const [view, setView] = useState("overview");
  const currentNode = history.length ? nodes[history[history.length - 1]] : null;
  function navigate(id: string) { setHistory(h => [...h, id]); setView("node"); }
  function jumpTo(i: number) { setHistory(h => h.slice(0, i + 1)); }
  function reset() { setHistory([]); setView("overview"); }
  function startAt(id: string) { setHistory([id]); setView("node"); }
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", padding:"22px 14px", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ width:"100%", maxWidth:680, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <button onClick={reset}
          style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 14px", color:C.dim, fontSize:12, cursor:"pointer", transition:"all 0.12s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor=C.grayL}
          onMouseLeave={e => e.currentTarget.style.borderColor=C.border}
        >← Overview</button>
        <div style={{ fontSize:11, color:C.dim, fontWeight:700, letterSpacing:"0.08em" }}>JUNIE SYSTEMS · OUTREACH WORKFLOW</div>
        <div style={{ width:80 }} />
      </div>
      {view === "overview" ? (
        <OverviewMap onStart={startAt} />
      ) : (
        <div style={{ maxWidth:580, width:"100%" }}>
          <Breadcrumb history={history} onJump={jumpTo} />
          {currentNode && <NodeCard node={currentNode} onNavigate={navigate} />}
          <div style={{ marginTop:16, textAlign:"center" }}>
            <button onClick={reset}
              style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 20px", color:C.dim, fontSize:13, cursor:"pointer" }}
            >← Back to overview</button>
          </div>
        </div>
      )}
    </div>
  );
}
