import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate topic and content using Lovable AI
    const topics = [
      "AI answering services revolutionizing customer support",
      "Voice AI technology transforming business communications",
      "AI automation trends in customer service",
      "How AI agents are reshaping appointment scheduling",
      "The future of conversational AI in business",
      "AI-powered call centers vs traditional call centers",
      "Machine learning in customer interaction automation",
      "Natural language processing for better customer experiences",
      "AI chatbots and voice assistants: The next evolution",
      "Implementing AI automation in small businesses",
      "ROI of AI answering services for enterprises",
      "AI voice cloning technology for business applications",
      "Sentiment analysis in AI customer service",
      "Multi-language support with AI translation services",
      "AI-driven analytics for customer insights",
      "Privacy and security in AI communication systems",
      "Integration of AI with CRM systems",
      "24/7 customer support with AI automation",
      "Reducing operational costs with AI answering services",
      "AI personalization in customer interactions",
      "Voice biometrics and AI authentication",
      "The role of GPT models in customer service",
      "AI appointment scheduling vs manual booking",
      "Handling peak call volumes with AI",
      "AI for lead qualification and nurturing",
      "Emotional intelligence in AI voice systems",
      "AI-powered FAQ automation",
      "The impact of AI on customer satisfaction scores",
      "AI call routing and intelligent distribution",
      "Building trust with AI-powered services",
      "AI transcription and call analysis",
      "Compliance and regulation in AI telephony",
      "AI voice quality and naturalness improvements",
      "Using AI to reduce customer wait times",
      "AI agent training and continuous learning",
      "Hybrid human-AI customer service models",
      "AI accessibility features for diverse users",
      "Real-time language translation with AI",
      "AI-powered voice surveys and feedback collection",
      "The ethics of AI in customer communications"
    ];

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    const prompt = `Write a comprehensive, SEO-optimized blog post about: "${randomTopic}"

Requirements:
- Minimum 400 words (aim for 500-700 words)
- Include an engaging title (max 60 characters for SEO)
- Write a compelling excerpt/meta description (max 160 characters)
- Use proper markdown formatting:
  * Use ## for main headings
  * Use ### for subheadings
  * Use **bold** for emphasis
  * Use proper paragraph spacing (blank lines between paragraphs)
  * Use bullet points with - or * where appropriate
  * Use > for blockquotes if needed
- Include practical examples and insights
- Focus on value for business owners and decision-makers
- Naturally incorporate relevant keywords
- Write in a professional yet conversational tone
- End with a clear takeaway or call to thought

IMPORTANT: Return ONLY valid JSON. Do not include any markdown code blocks or extra text.

Format your response as this exact JSON structure:
{
  "title": "SEO-friendly title here",
  "excerpt": "Compelling meta description here",
  "content": "Full article content in markdown format with ## headings, **bold text**, and proper paragraph spacing"
}`;

    console.log("Generating blog post with AI for topic:", randomTopic);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert content writer specializing in AI technology, automation, and business communications. Write engaging, informative, and SEO-optimized blog posts."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content generated from AI");
    }

    console.log("AI response received, parsing content...");

    // Parse the JSON response
    let blogData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      blogData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback: use the content as-is
      blogData = {
        title: randomTopic,
        excerpt: aiContent.substring(0, 160),
        content: aiContent
      };
    }

    // Generate slug from title
    const slug = blogData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 200);

    // Check if slug already exists
    const { data: existingPost } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .single();

    let finalSlug = slug;
    if (existingPost) {
      // Add timestamp to make it unique
      finalSlug = `${slug}-${Date.now()}`;
    }

    // Get or create a system user for blog posts
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);

    if (!adminUsers || adminUsers.length === 0) {
      throw new Error("No admin user found to assign as blog post author");
    }

    const authorId = adminUsers[0].user_id;

    // Generate hero image using Lovable AI
    console.log('Generating hero image for blog post...');
    let heroImageDataUrl = null;
    try {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: `Generate a professional, modern hero image for a blog post titled "${blogData.title}". The image should be suitable for a business blog about AI and automation. Style: clean, professional, tech-focused, modern, high quality.`
            }
          ],
          modalities: ["image", "text"]
        })
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        heroImageDataUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        console.log('Hero image generated successfully');
      } else {
        console.error('Failed to generate hero image:', await imageResponse.text());
      }
    } catch (imageError) {
      console.error('Error generating hero image:', imageError);
      // Continue without hero image
    }

    // Insert the blog post
    const { data: newPost, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: blogData.title,
        slug: finalSlug,
        excerpt: blogData.excerpt,
        content: blogData.content,
        hero_image: heroImageDataUrl,
        published: true,
        published_at: new Date().toISOString(),
        author_id: authorId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw insertError;
    }

    console.log("Blog post created successfully:", newPost.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: newPost,
        message: "Blog post generated and published successfully" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-blog-post:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
