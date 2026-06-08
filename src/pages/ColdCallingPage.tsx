// @ts-nocheck
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

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
  // ===== PREP =====
  shift_prep: {
    id: "shift_prep", phase: "STEP 0", icon: "🧰",
    title: "Before Starting Your Shift",
    color: C.purple, dim: C.purpleDim,
    instruction: "Get set up before you dial the first number. Don't wing the start of the shift.",
    actionSteps: [
      "Log into Go High Level.",
      "Verify your phone number is working (make a quick test call).",
      "Open the Lead Sheet, the Script, and this Objection Handling guide.",
      "Remove distractions, no phone scrolling, no background TV.",
      "Be ready to make calls. Energy matters, they can hear it.",
    ],
    note: "The goal is NOT to sell. The goal is to start conversations and book qualified appointments. You're selling the meeting, not the service.",
    branches: [{ label: "I'm set up → start dialing", next: "opener", color: C.blue }],
  },

  // ===== OPENER =====
  opener: {
    id: "opener", phase: "STEP 1", icon: "📞",
    title: "Opener: Give them an out, then ask the question",
    color: C.blue, dim: C.blueDim,
    instruction: "Open with the permission line, then go straight to the question. Sound natural. Do not read word-for-word.",
    lines: [
      { label: "Say this:", text: "Hey man, this is [NAME].\n\nReal quick, this is a cold call, so you can either give me 30 seconds or tell me to kick rocks.\n\nJust curious… how are you getting most of your customers right now?" },
    ],
    branches: [
      { label: "💬 \"Referrals\"", next: "src_referrals", color: C.teal },
      { label: "💬 \"Facebook posts\"", next: "src_fb_posts", color: C.teal },
      { label: "💬 \"Facebook ads\"", next: "src_fb_ads", color: C.teal },
      { label: "💬 \"Thumbtack / Angi / Yelp\"", next: "src_thumbtack", color: C.teal },
      { label: "💬 \"Word of mouth\"", next: "src_wom", color: C.teal },
      { label: "🛑 Immediate objection (busy, not interested, etc.)", next: "objections_hub", color: C.orange },
      { label: "📵 No answer", next: "dead_no_answer", color: C.grayL },
      { label: "📭 Voicemail", next: "dead_voicemail", color: C.grayL },
    ],
  },

  // ===== SOURCE BRANCHES =====
  src_referrals: {
    id: "src_referrals", phase: "DISCOVERY", icon: "🤝",
    title: "They said: Referrals",
    color: C.teal, dim: C.tealDim,
    lines: [{ label: null, text: "Gotcha. Nothing wrong with referrals.\n\nThe only thing that scares me about referrals is you can't really control them. Some months they're great. Some months they're not.\n\nHave you noticed that?" }],
    branches: [
      { label: "They agree / open up → transition", next: "transition", color: C.green },
      { label: "Push back → objection", next: "objections_hub", color: C.orange },
    ],
  },
  src_fb_posts: {
    id: "src_fb_posts", phase: "DISCOVERY", icon: "📱",
    title: "They said: Facebook posts",
    color: C.teal, dim: C.tealDim,
    lines: [
      { label: "Ask:", text: "Gotcha. Are you posting yourself or do you have somebody doing it for you?" },
      { label: "Then follow with:", text: "Makes sense. The challenge I see with Facebook posts is you can post every day and still not get in front of people who actually need your service right now.\n\nHave you noticed that?" },
    ],
    branches: [
      { label: "They agree → transition", next: "transition", color: C.green },
      { label: "Push back → objection", next: "objections_hub", color: C.orange },
    ],
  },
  src_fb_ads: {
    id: "src_fb_ads", phase: "DISCOVERY", icon: "🎯",
    title: "They said: Facebook ads",
    color: C.teal, dim: C.tealDim,
    lines: [{ label: null, text: "Nice. Are the ads bringing in enough estimates, or are you looking for more opportunities?" }],
    branches: [
      { label: "They want more → transition", next: "transition", color: C.green },
      { label: "Happy with current volume → soft close", next: "soft_close", color: C.grayL },
    ],
  },
  src_thumbtack: {
    id: "src_thumbtack", phase: "DISCOVERY", icon: "📋",
    title: "They said: Thumbtack / Angi / Yelp",
    color: C.teal, dim: C.tealDim,
    lines: [
      { label: "Ask:", text: "Gotcha. How's that been treating you?" },
      { label: "Then follow with:", text: "Yeah, that's what I hear a lot. Seems like most guys end up paying for leads they're competing with 4 or 5 other contractors for.\n\nHave you run into that at all?" },
    ],
    branches: [
      { label: "They agree → transition", next: "transition", color: C.green },
      { label: "Push back → objection", next: "objections_hub", color: C.orange },
    ],
  },
  src_wom: {
    id: "src_wom", phase: "DISCOVERY", icon: "👂",
    title: "They said: Word of mouth",
    color: C.teal, dim: C.tealDim,
    lines: [{ label: null, text: "Gotcha. Nothing wrong with word of mouth. The only challenge is it's hard to predict.\n\nSome weeks the phone rings. Some weeks it's quiet. Have you noticed that?" }],
    branches: [
      { label: "They agree → transition", next: "transition", color: C.green },
      { label: "Push back → objection", next: "objections_hub", color: C.orange },
    ],
  },

  // ===== TRANSITION =====
  transition: {
    id: "transition", phase: "STEP 2", icon: "🌉",
    title: "Transition: Visibility problem",
    color: C.blue, dim: C.blueDim,
    instruction: "Reframe their lead source as a visibility issue, then ask the growth question.",
    lines: [{ label: null, text: "Gotcha. Honestly, that's exactly why I asked.\n\nMost contractors don't have a work problem. They have a visibility problem. If more people knew you existed, you'd probably be running more estimates.\n\nAre you actively trying to grow right now, or are you pretty happy with where things are?" }],
    branches: [
      { label: "💪 \"I want to grow\"", next: "grow_yes", color: C.green },
      { label: "😐 \"Happy where I am\"", next: "soft_close", color: C.grayL },
      { label: "🛑 Objection", next: "objections_hub", color: C.orange },
    ],
  },

  grow_yes: {
    id: "grow_yes", phase: "STEP 3", icon: "✨",
    title: "Magic Wand + Offer the Meeting",
    color: C.green, dim: C.greenDim,
    instruction: "Get them painting the picture, then offer the meeting with the lunch close.",
    lines: [
      { label: "Ask:", text: "Makes sense. If you could wave a magic wand and get a few more jobs every month, what would that do for the business?" },
      { label: "Then offer the meeting:", text: "Gotcha. Would you be against me showing you how other contractors are generating opportunities consistently without relying completely on [REFERRALS / THUMBTACK / ANGI / YELP / WORD OF MOUTH / FACEBOOK POSTS]?\n\nWorst case, you get a couple ideas you can use in your business. And if it's a complete waste of your time, I'll buy you lunch. Fair enough?" },
    ],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "🛑 Objection", next: "objections_hub", color: C.orange },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },

  soft_close: {
    id: "soft_close", phase: "CLOSE", icon: "👋",
    title: "Happy Where They Are: Soft Close",
    color: C.grayL, dim: C.faint,
    instruction: "Be gracious. Don't push. Leave the door open.",
    lines: [{ label: null, text: "Totally fair. Appreciate you taking the call. If anything ever changes and you want to take a look, my number's right here. Have a good one." }],
    branches: [
      { label: "Mark Callback Requested →", next: "dead_callback", color: C.teal },
      { label: "Mark Not Interested →", next: "dead_not_interested", color: C.grayL },
    ],
  },

  // ===== BOOKING =====
  book_timezone: {
    id: "book_timezone", phase: "STEP 4", icon: "🌎",
    title: "Confirm Their Time Zone",
    color: C.teal, dim: C.tealDim,
    instruction: "Before offering times, ALWAYS ask what time zone they're in. Then change the time zone selector on the calendar (top of the embed →) so the slots you offer match their local time. Never offer a time without doing this first.",
    lines: [
      { label: "Ask:", text: "Real quick before we lock in a time — what time zone are you in?" },
      { label: "Confirm back:", text: "Got it, [TIME ZONE]. Let me pull up some times that work for you." },
    ],
    postSteps: [
      "On the calendar widget, click the time zone dropdown at the top.",
      "Switch it to the customer's time zone (Eastern / Central / Mountain / Pacific / etc.).",
      "Verify the available slots have refreshed to their local time.",
      "Now pick the two days / windows you'll offer them.",
    ],
    branches: [
      { label: "✅ Time zone set on calendar → offer times", next: "book_offer", color: C.green },
    ],
  },

  book_offer: {
    id: "book_offer", phase: "STEP 5", icon: "📅",
    title: "Offer Two Days, Then Two Windows",
    color: C.teal, dim: C.tealDim,
    instruction: "Tight binary choices. Don't ask \"when's good?\" — give them two days, then two windows.",
    lines: [
      { label: "Say this:", text: "Awesome. What day works better for you, Tuesday or Wednesday?" },
      { label: "Then:", text: "Morning or afternoon?" },
    ],
    branches: [
      { label: "✅ They pick → confirm the booking", next: "book_confirm", color: C.green },
      { label: "🛑 Objection / hesitation", next: "objections_hub", color: C.orange },
    ],
  },

  book_confirm: {
    id: "book_confirm", phase: "🎯 GOAL", icon: "🎉",
    title: "Confirm the Appointment",
    color: C.green, dim: C.greenDim,
    isGoal: true,
    instruction: "Lock in the time, verify contact info, and use the alien invasion line for commitment.",
    lines: [
      { label: "Confirm:", text: "Perfect. I've got you down for [DAY/TIME]. You'll get a confirmation as well." },
      { label: "Commitment line:", text: "And besides an alien invasion, the world ending, or winning the lottery… is there any reason you wouldn't be able to make the meeting?" },
      { label: "Sign off:", text: "Awesome. Talk soon." },
    ],
    postSteps: [
      "Verify phone number on file is correct.",
      "Verify email address.",
      "Book the appointment in Go High Level.",
      "Mark the lead as Appointment Booked.",
      "Add notes from the call.",
    ],
    branches: [],
  },

  // ===== OBJECTIONS HUB =====
  objections_hub: {
    id: "objections_hub", phase: "OBJECTIONS", icon: "⚡",
    title: "Pick the Objection You're Hearing",
    color: C.orange, dim: C.orangeDim,
    instruction: "Tap the objection that matches what they just said. Each one routes back to a booking attempt.",
    branches: [
      { label: "💬 \"We're good\"", next: "obj_were_good", color: C.orange },
      { label: "💬 \"I'm too busy\"", next: "obj_too_busy", color: C.orange },
      { label: "💬 \"We already have someone handling our marketing\"", next: "obj_have_marketing", color: C.orange },
      { label: "💬 \"How much does it cost?\"", next: "obj_cost", color: C.orange },
      { label: "💬 \"How does it work?\"", next: "obj_how_works", color: C.orange },
      { label: "💬 \"Just send me some information\"", next: "obj_send_info", color: C.orange },
      { label: "💬 \"I'm not interested\"", next: "obj_not_interested", color: C.orange },
      { label: "💬 \"Call me back in a few months\"", next: "obj_callback", color: C.orange },
      { label: "💬 \"I need to talk to my partner/wife\"", next: "obj_partner", color: C.orange },
    ],
  },

  obj_were_good: {
    id: "obj_were_good", phase: "OBJECTION", icon: "👍",
    title: "\"We're good\"",
    color: C.orange, dim: C.orangeDim,
    lines: [
      { label: "Open:", text: "Perfect, that's awesome.\n\nQuick question… if you were in the exact same position 3 months from now, would you be happy with where things are?" },
      { label: "After they answer:", text: "Gotcha. Look, I'm not trying to get married here or have you commit to anything.\n\nI just want to show you how other contractors are generating opportunities consistently without relying completely on [referrals / Thumbtack / Angi / Yelp / word of mouth / Facebook posts].\n\nWorst case, you get a couple ideas you can use in your business. And if it's a complete waste of your time, I'll buy you lunch. Fair enough?" },
    ],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },

  obj_too_busy: {
    id: "obj_too_busy", phase: "OBJECTION", icon: "⏱️",
    title: "\"I'm too busy\"",
    color: C.orange, dim: C.orangeDim,
    lines: [
      { label: "Open:", text: "I completely understand. Most successful contractors are busy.\n\nQuick question… if I called you 3 months from now and things looked exactly the same as they do today, would you be happy with that?" },
      { label: "After they answer:", text: "Gotcha. Look, I'm not trying to get married here or have you commit to anything.\n\nI'm just asking for 15 minutes to see if there's even a conversation worth having. Worst case, you tell me I'm full of crap and we both move on. Fair enough?" },
    ],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "📆 \"Call me back\"", next: "obj_callback", color: C.orange },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },

  obj_have_marketing: {
    id: "obj_have_marketing", phase: "OBJECTION", icon: "🧑‍💼",
    title: "\"We already have someone handling our marketing\"",
    color: C.orange, dim: C.orangeDim,
    lines: [
      { label: "Open:", text: "That's awesome.\n\nQuick question… if everything was working exactly the way you wanted it to, would I even be talking to you right now?" },
      { label: "After they answer:", text: "Gotcha. Look, I'm not trying to get married here or have you commit to anything.\n\nI'm just asking for 15 minutes to see if there's even a conversation worth having. Worst case, you tell me I'm full of crap and we both move on. Fair enough?" },
    ],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },

  obj_cost: {
    id: "obj_cost", phase: "OBJECTION", icon: "💰",
    title: "\"How much does it cost?\"",
    color: C.orange, dim: C.orangeDim,
    instruction: "Do not give a number. Reframe and push to the meeting. If they push again, use the second response.",
    lines: [
      { label: "First response:", text: "That's a great question. Honestly, we don't know enough about your business yet to answer that accurately. That would be like you giving me an estimate without seeing the job first.\n\nLook, I'm not trying to get married here or have you commit to anything. I'm just asking for 15 minutes to see if there's even a conversation worth having. Worst case, you tell me I'm full of crap and we both move on. Fair enough?" },
    ],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "🔁 They push again on price", next: "obj_cost_persist", color: C.orange },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },
  obj_cost_persist: {
    id: "obj_cost_persist", phase: "OBJECTION", icon: "💰",
    title: "Price: they pushed again",
    color: C.orange, dim: C.orangeDim,
    lines: [{ label: null, text: "Totally fair. Honestly, some of our clients spend a few hundred bucks a month and some spend quite a bit more. It really depends on the business, the market, and what they're trying to accomplish.\n\nThat's why I don't want to throw out a number that may not even apply to you. Would you be against taking 15 minutes just to see if it even makes sense first?" }],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },

  obj_how_works: {
    id: "obj_how_works", phase: "OBJECTION", icon: "⚙️",
    title: "\"How does it work?\"",
    color: C.orange, dim: C.orangeDim,
    lines: [{ label: null, text: "Great question.\n\nThe simple version is we help contractors get in front of more potential customers and follow up with them faster. Most guys are great at the work. The challenge is getting enough opportunities consistently.\n\nThat's really what the meeting is for. We'll take a look at what you're doing now, where you want to go, and see if there's even a fit.\n\nLook, I'm not trying to get married here or have you commit to anything. I'm just asking for 15 minutes to see if there's even a conversation worth having. Worst case, you tell me I'm full of crap and we both move on. Fair enough?" }],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },

  obj_send_info: {
    id: "obj_send_info", phase: "OBJECTION", icon: "📧",
    title: "\"Just send me some information\"",
    color: C.orange, dim: C.orangeDim,
    lines: [
      { label: "First clarify:", text: "Absolutely. Just so I send you the right thing, what would you like me to send over?" },
      { label: "After they answer:", text: "Gotcha. Listen, to be honest, we both know how this usually goes. I send over some information, you get busy running jobs, a bunch of other emails come in, and it ends up buried in your inbox.\n\nLook, I'm not trying to get married here or have you commit to anything. I'm just asking for 15 minutes to see if there's even a conversation worth having. Worst case, you tell me I'm full of crap and we both move on. Fair enough?" },
    ],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "❌ Still wants info only", next: "dead_not_interested", color: C.red },
    ],
  },

  obj_not_interested: {
    id: "obj_not_interested", phase: "OBJECTION", icon: "🚫",
    title: "\"I'm not interested\"",
    color: C.orange, dim: C.orangeDim,
    lines: [
      { label: "Open:", text: "No worries. Out of curiosity… what are you currently doing to bring in new customers?" },
      { label: "After they answer:", text: "Gotcha. Quick question… if you were in the exact same position 3 months from now, would you be happy with that?" },
      { label: "Then close for the meeting:", text: "Look, I'm not trying to get married here or have you commit to anything. I'm just asking for 15 minutes to see if there's even a conversation worth having. Worst case, you tell me I'm full of crap and we both move on. Fair enough?" },
    ],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "❌ Hard no → close it out", next: "dead_not_interested", color: C.red },
    ],
  },

  obj_callback: {
    id: "obj_callback", phase: "OBJECTION", icon: "📆",
    title: "\"Call me back in a few months\"",
    color: C.orange, dim: C.orangeDim,
    lines: [
      { label: "Open:", text: "Absolutely. Out of curiosity… what's happening in a few months that isn't happening right now?" },
      { label: "After they answer:", text: "Gotcha. The only reason I ask is because most contractors tell me to call them back in a few months, and then a few months turns into six months, then a year, and nothing really changes.\n\nLook, I'm not trying to get married here or have you commit to anything. I'm just asking for 15 minutes to see if there's even a conversation worth having. Worst case, you tell me I'm full of crap and we both move on. Fair enough?" },
    ],
    branches: [
      { label: "✅ Yes → book it now", next: "book_timezone", color: C.green },
      { label: "📆 Mark Callback Requested", next: "dead_callback", color: C.teal },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },

  obj_partner: {
    id: "obj_partner", phase: "OBJECTION", icon: "👫",
    title: "\"I need to talk to my partner / wife\"",
    color: C.orange, dim: C.orangeDim,
    lines: [
      { label: "Open:", text: "Absolutely. I would probably do the same thing.\n\nJust so I understand… if your partner said, \"Sounds good, let's do it,\" is there anything else that would stop you from wanting to take a look?" },
      { label: "After they answer:", text: "Gotcha. Look, I'm not trying to get married here or have you commit to anything. I'm just asking for 15 minutes to see if there's even a conversation worth having. Worst case, you tell me I'm full of crap and we both move on. Fair enough?" },
    ],
    branches: [
      { label: "✅ Yes → book it", next: "book_timezone", color: C.green },
      { label: "🙅 \"No, I really need to talk to them first\"", next: "obj_partner_persist", color: C.orange },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },
  obj_partner_persist: {
    id: "obj_partner_persist", phase: "OBJECTION", icon: "👫",
    title: "Partner: invite them to the call",
    color: C.orange, dim: C.orangeDim,
    lines: [{ label: null, text: "Makes sense. Would it be easier if your partner joined the call as well? That way everyone gets the same information and nobody has to play telephone afterward." }],
    branches: [
      { label: "✅ Yes → book it with both", next: "book_timezone", color: C.green },
      { label: "📆 Callback to set with partner", next: "dead_callback", color: C.teal },
      { label: "❌ Hard no", next: "dead_not_interested", color: C.red },
    ],
  },

  // ===== CLOSED / LEAD STATUS =====
  dead_no_answer: {
    id: "dead_no_answer", phase: "CLOSED", icon: "📵",
    title: "No Answer",
    color: C.grayL, dim: C.faint, isDead: true,
    closeSteps: ["Lead Status: No Answer", "Leave a note in the lead sheet", "Next lead"],
    branches: [],
  },
  dead_voicemail: {
    id: "dead_voicemail", phase: "CLOSED", icon: "📭",
    title: "Left Voicemail",
    color: C.grayL, dim: C.faint, isDead: true,
    closeSteps: ["Lead Status: Left Voicemail", "Note the time of the voicemail", "Schedule a callback attempt"],
    branches: [],
  },
  dead_not_interested: {
    id: "dead_not_interested", phase: "CLOSED", icon: "🗂️",
    title: "Not Interested: Closed",
    color: C.grayL, dim: C.faint, isDead: true,
    closeSteps: ["Lead Status: Not Interested", "Note the reason in the lead sheet", "Next lead"],
    branches: [],
  },
  dead_callback: {
    id: "dead_callback", phase: "CLOSED", icon: "🔁",
    title: "Callback Requested",
    color: C.teal, dim: C.tealDim, isDead: true,
    closeSteps: ["Lead Status: Callback Requested", "Set the callback date/time", "Add a calendar reminder for yourself"],
    branches: [],
  },
};

// ===== SHARED UI =====
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
      style={{ background: copied ? "#10b981" : "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, padding: "3px 8px", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function ScriptLine({ text, label }) {
  return (
    <div style={{ marginTop: 10 }}>
      {label && <div style={{ fontSize: 10, color: C.dim, marginBottom: 5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>}
      <div style={{ background: "linear-gradient(135deg,#0b1830,#0e1f3e)", border: `1px solid ${C.blue}55`, borderRadius: 12, padding: "12px 15px", fontSize: 14, color: C.text, lineHeight: 1.65, display: "flex", gap: 10, alignItems: "flex-start", whiteSpace: "pre-wrap" }}>
        <span style={{ fontSize: 16, marginTop: 1 }}>🎙️</span>
        <div style={{ flex: 1 }}>{text}</div>
        
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
  return (
    <div style={{ background: C.card, border: `1.5px solid ${node.color}33`, borderRadius: 18, overflow: "hidden", boxShadow: isGoal ? `0 0 48px ${C.green}28` : `0 0 20px ${node.color}12`, maxWidth: 620, width: "100%" }}>
      <div style={{ background: isGoal ? `linear-gradient(135deg,${C.greenDim},#083320)` : isDead ? "linear-gradient(135deg,#0d0d0d,#111)" : `linear-gradient(135deg,${node.dim},${node.color}1a)`, borderBottom: `1px solid ${node.color}30`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 26 }}>{node.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: node.color, letterSpacing: "0.12em", textTransform: "uppercase" }}>{node.phase}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{node.title}</div>
        </div>
        {isGoal && <div style={{ background: C.green, borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 800, color: "#fff" }}>🎯 BOOKED</div>}
      </div>
      <div style={{ padding: "16px 20px" }}>
        {node.instruction && (
          <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6, marginBottom: 10, borderLeft: `3px solid ${node.color}55`, paddingLeft: 10 }}>
            {node.instruction}
          </div>
        )}
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
        {node.lines && node.lines.map((l, i) => <ScriptLine key={i} label={l.label} text={l.text} />)}
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
            <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>The customer responds with:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {node.branches.map((b, i) => (
                <button key={i} onClick={() => onNavigate(b.next)}
                  style={{ background: `${b.color}12`, border: `1.5px solid ${b.color}40`, borderRadius: 10, padding: "10px 14px", color: b.color, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${b.color}25`; e.currentTarget.style.borderColor = b.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${b.color}12`; e.currentTarget.style.borderColor = `${b.color}40`; }}>
                  <span>{b.label}</span>
                  <span style={{ opacity: 0.5 }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {isGoal && <div style={{ marginTop: 18, textAlign: "center" }}><div style={{ fontSize: 22, marginBottom: 6 }}>🎉</div><div style={{ fontSize: 14, fontWeight: 800, color: C.greenL }}>That's the job. Appointment is on the calendar.</div></div>}
        {isDead && <div style={{ marginTop: 12, textAlign: "center", padding: "8px 0" }}><div style={{ fontSize: 12, color: C.grayL }}>Path closed. Update the lead sheet and dial the next number.</div></div>}
      </div>
    </div>
  );
}

const LBL = {
  shift_prep: "Prep",
  opener: "Opener",
  src_referrals: "Referrals",
  src_fb_posts: "FB Posts",
  src_fb_ads: "FB Ads",
  src_thumbtack: "Thumbtack/Angi/Yelp",
  src_wom: "Word of Mouth",
  transition: "Transition",
  grow_yes: "Magic Wand",
  soft_close: "Soft Close",
  book_timezone: "Time Zone",
  book_offer: "Offer Times",
  book_confirm: "Booked ✓",
  objections_hub: "Objections",
  obj_were_good: "We're good",
  obj_too_busy: "Too busy",
  obj_have_marketing: "Have marketing",
  obj_cost: "Cost?",
  obj_cost_persist: "Cost x2",
  obj_how_works: "How does it work?",
  obj_send_info: "Send info",
  obj_not_interested: "Not interested",
  obj_callback: "Callback",
  obj_partner: "Partner",
  obj_partner_persist: "Partner x2",
  dead_no_answer: "No answer",
  dead_voicemail: "Voicemail",
  dead_not_interested: "Closed",
  dead_callback: "Callback",
};

function Breadcrumb({ history, onJump }) {
  if (history.length <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 18 }}>
      {history.map((id, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button onClick={() => i < history.length - 1 && onJump(i)}
            style={{ background: i === history.length - 1 ? C.blue : "transparent", border: `1px solid ${i === history.length - 1 ? C.blue : C.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 11, color: i === history.length - 1 ? "#fff" : C.dim, cursor: i === history.length - 1 ? "default" : "pointer", fontWeight: i === history.length - 1 ? 700 : 400 }}>
            {LBL[id] || id}
          </button>
          {i < history.length - 1 && <span style={{ color: C.faint, fontSize: 13 }}>›</span>}
        </span>
      ))}
    </div>
  );
}

const BOOKING_NODES = new Set([
  "grow_yes", "book_timezone", "book_offer", "book_confirm",
  "obj_were_good", "obj_too_busy", "obj_have_marketing",
  "obj_cost", "obj_cost_persist", "obj_how_works", "obj_send_info",
  "obj_not_interested", "obj_callback", "obj_partner", "obj_partner_persist",
]);

function BookingCalendar() {
  useEffect(() => {
    const existing = document.querySelector('script[src="https://api.juniesystems.com/js/form_embed.js"]');
    if (existing) return;
    const s = document.createElement('script');
    s.src = 'https://api.juniesystems.com/js/form_embed.js';
    s.type = 'text/javascript';
    s.async = true;
    document.body.appendChild(s);
  }, []);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.tealL, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        📅 Ricky's calendar — pick open slots to offer
      </div>
      <iframe
        src="https://api.juniesystems.com/widget/booking/fBlaNQM6Ay3RD1FiID1Z"
        style={{ width: "100%", border: "none", height: "80vh", minHeight: 700, display: "block" }}
        scrolling="yes"
        title="Booking Calendar"
      />
    </div>
  );
}

function OverviewMap({ onStart }) {
  const mainFlow = [
    { id: "shift_prep", icon: "🧰", label: "Prep", color: C.purple },
    { id: "opener", icon: "📞", label: "Opener", color: C.blue },
    { id: "transition", icon: "🌉", label: "Transition", color: C.blue },
    { id: "grow_yes", icon: "✨", label: "Magic Wand", color: C.green },
    { id: "book_offer", icon: "📅", label: "Offer Times", color: C.teal },
    { id: "book_confirm", icon: "🎉", label: "Booked", color: C.green },
  ];
  const sources = [
    { id: "src_referrals", icon: "🤝", label: "Referrals" },
    { id: "src_fb_posts", icon: "📱", label: "Facebook posts" },
    { id: "src_fb_ads", icon: "🎯", label: "Facebook ads" },
    { id: "src_thumbtack", icon: "📋", label: "Thumbtack/Angi/Yelp" },
    { id: "src_wom", icon: "👂", label: "Word of mouth" },
  ];
  const objections = [
    { id: "obj_were_good", icon: "👍", label: "We're good" },
    { id: "obj_too_busy", icon: "⏱️", label: "Too busy" },
    { id: "obj_have_marketing", icon: "🧑‍💼", label: "Have marketing" },
    { id: "obj_cost", icon: "💰", label: "How much?" },
    { id: "obj_how_works", icon: "⚙️", label: "How does it work?" },
    { id: "obj_send_info", icon: "📧", label: "Send info" },
    { id: "obj_not_interested", icon: "🚫", label: "Not interested" },
    { id: "obj_callback", icon: "📆", label: "Callback later" },
    { id: "obj_partner", icon: "👫", label: "Talk to partner" },
  ];
  const closed = [
    { id: "dead_no_answer", icon: "📵", label: "No answer" },
    { id: "dead_voicemail", icon: "📭", label: "Voicemail" },
    { id: "dead_callback", icon: "🔁", label: "Callback requested" },
    { id: "dead_not_interested", icon: "🗂️", label: "Not interested" },
  ];
  const Btn = ({ item, color }) => (
    <button onClick={() => onStart(item.id)}
      style={{ background: `${color}10`, border: `1px solid ${color}33`, borderRadius: 8, padding: "8px 10px", color, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", transition: "all 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}22`; e.currentTarget.style.borderColor = `${color}66`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = `${color}33`; }}>
      {item.icon} {item.label}
    </button>
  );
  return (
    <div style={{ maxWidth: 720, width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.blueL, fontWeight: 700, marginBottom: 8 }}>Junie Systems</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 6 }}>Cold Calling Workflow</div>
        <div style={{ fontSize: 13, color: C.dim, maxWidth: 460, margin: "0 auto", lineHeight: 1.65 }}>
          Appointment Setter playbook. Start conversations, handle the objection, book the meeting. You're selling the meeting, not the service.
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.blueL, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Main flow</div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0, rowGap: 10 }}>
          {mainFlow.map((n, i) => (
            <span key={n.id} style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => onStart(n.id)}
                style={{ background: n.id === "book_confirm" ? C.green : `${n.color}18`, border: `2px solid ${n.color}`, borderRadius: 11, padding: "9px 13px", color: n.id === "book_confirm" ? "#fff" : n.color, fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center", minWidth: 88, transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = `${n.color}35`; e.currentTarget.style.transform = "scale(1.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = n.id === "book_confirm" ? C.green : `${n.color}18`; e.currentTarget.style.transform = "scale(1)"; }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{n.icon}</div>
                <div style={{ fontSize: 10.5 }}>{n.label}</div>
              </button>
              {i < mainFlow.length - 1 && <div style={{ color: C.grayL, fontSize: 18, margin: "0 3px", opacity: 0.4 }}>→</div>}
            </span>
          ))}
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.tealL, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>🎧 How are you getting customers? — branches</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 8 }}>
          {sources.map(o => <Btn key={o.id} item={o} color={C.teal} />)}
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>⚡ Objection handling — all route back to booking</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 8 }}>
          {objections.map(o => <Btn key={o.id} item={o} color={C.orange} />)}
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.grayL, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>📒 After-call lead statuses</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 8 }}>
          {closed.map(o => <Btn key={o.id} item={o} color={C.grayL} />)}
        </div>
      </div>
      <div style={{ background: "#080f20", border: `1px solid ${C.blue}44`, borderRadius: 12, padding: "14px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.blueL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>🎯 The rule: you're selling the meeting, not the service</div>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.65 }}>
          Don't sell. Don't quote pricing. Don't promise results. Get them talking, surface the visibility problem, and book 15-20 minutes on the calendar.
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.purpleL, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>📋 Rules to always follow</div>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 6 }}>
          <div>• Sound natural. Do NOT read word-for-word.</div>
          <div>• Ask questions. Listen more than you talk.</div>
          <div>• Never argue with prospects. Use the objection handling guide.</div>
          <div>• Do NOT sell the service or discuss pricing in detail.</div>
          <div>• Do NOT promise results or make up answers.</div>
          <div>• If they ask detailed questions, book the appointment.</div>
          <div>• Always update the lead sheet after the call. Always leave notes.</div>
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.orangeL, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>📝 End of shift report — submit every day</div>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 4 }}>
          <div>Name · Dials · Conversations · Appointments Booked</div>
          <div>Interesting Objections Heard · Notes</div>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <button onClick={() => onStart("shift_prep")}
          style={{ background: C.blue, border: "none", borderRadius: 12, padding: "13px 34px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 0 28px ${C.blue}44`, transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = C.blueL; e.currentTarget.style.transform = "scale(1.03)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.transform = "scale(1)"; }}>
          Start from the beginning →
        </button>
      </div>
    </div>
  );
}

export default function ColdCallingPage() {
  const [history, setHistory] = useState<string[]>([]);
  const [view, setView] = useState("overview");
  const currentNode = history.length ? nodes[history[history.length - 1]] : null;
  function navigate(id: string) { setHistory(h => [...h, id]); setView("node"); }
  function jumpTo(i: number) { setHistory(h => h.slice(0, i + 1)); }
  function reset() { setHistory([]); setView("overview"); }
  function startAt(id: string) { setHistory([id]); setView("node"); }
  function goBack() {
    if (history.length <= 1) { reset(); return; }
    setHistory(h => h.slice(0, -1));
  }
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", padding: "22px 14px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 720, marginBottom: 14 }}>
        <Link to="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", color: C.dim, fontSize: 12, textDecoration: "none" }}>
          ← Back to Admin
        </Link>
      </div>
      <div style={{ width: "100%", maxWidth: 720, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        {view === "overview" ? <div style={{ width: 80 }} /> : (
          <button onClick={reset}
            style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", color: C.dim, fontSize: 12, cursor: "pointer", transition: "all 0.12s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.grayL}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            ← Overview
          </button>
        )}
        <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, letterSpacing: "0.08em" }}>JUNIE SYSTEMS · COLD CALLING WORKFLOW</div>
        <div style={{ width: 80 }} />
      </div>
      {view === "overview" ? (
        <OverviewMap onStart={startAt} />
      ) : (() => {
        const showCal = currentNode && BOOKING_NODES.has(currentNode.id);
        return (
          <div style={{ width: "100%", maxWidth: showCal ? 1280 : 620, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ flex: showCal ? "1 1 580px" : "0 1 620px", maxWidth: 620, width: "100%" }}>
              <Breadcrumb history={history} onJump={jumpTo} />
              {currentNode && <NodeCard node={currentNode} onNavigate={navigate} />}
              <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                <button onClick={goBack}
                  style={{ background: C.blueDim, border: `1px solid ${C.blue}66`, borderRadius: 8, padding: "8px 20px", color: C.blueL, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  ← Previous step
                </button>
                <button onClick={reset}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 20px", color: C.dim, fontSize: 13, cursor: "pointer" }}>
                  Back to overview
                </button>
              </div>
            </div>
            {showCal && (
              <div style={{ flex: "1 1 560px", maxWidth: 640, width: "100%", position: "sticky", top: 16 }}>
                <BookingCalendar />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
