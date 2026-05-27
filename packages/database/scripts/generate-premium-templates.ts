import { db } from "../index";
import { templatesTable, templateFieldsTable } from "../models/template";
import { v4 as uuidv4 } from "uuid";

const INDUSTRIES = [
  { name: "Real Estate", style: "real_estate" },
  { name: "Healthcare", style: "healthcare" },
  { name: "SaaS & Tech", style: "technology" },
  { name: "E-Commerce", style: "ecommerce" },
  { name: "Creative Agency", style: "marketing" },
  { name: "Law Firm", style: "corporate" },
  { name: "Event Management", style: "event" },
  { name: "Fitness & Gym", style: "fitness" },
  { name: "Education", style: "education" },
  { name: "Hospitality", style: "hospitality" },
];

const FORM_TYPES = [
  "Lead Capture",
  "Customer Feedback",
  "Event Registration",
  "Job Application",
  "Service Booking",
];

function generateFields(industry: string, formType: string) {
  const fields = [];
  let order = 1;

  // Standard fields for almost all forms
  fields.push({
    id: uuidv4(),
    type: "short_text",
    label: "Full Name",
    required: true,
    order: order++,
  });

  fields.push({
    id: uuidv4(),
    type: "email",
    label: "Email Address",
    required: true,
    order: order++,
  });

  // Dynamic fields based on form type and industry
  if (formType === "Lead Capture") {
    fields.push({
      id: uuidv4(),
      type: "short_text",
      label: industry === "Real Estate" ? "Property of Interest" : "Company Name",
      required: false,
      order: order++,
    });
    fields.push({
      id: uuidv4(),
      type: "select",
      label: "Budget Range",
      required: true,
      options: ["$1k - $5k", "$5k - $10k", "$10k+"],
      order: order++,
    });
  } else if (formType === "Customer Feedback") {
    fields.push({
      id: uuidv4(),
      type: "rating",
      label: `How would you rate your experience with our ${industry} services?`,
      required: true,
      order: order++,
    });
    fields.push({
      id: uuidv4(),
      type: "long_text",
      label: "Any additional feedback?",
      required: false,
      order: order++,
    });
  } else if (formType === "Event Registration") {
    fields.push({
      id: uuidv4(),
      type: "number",
      label: "Number of Attendees",
      required: true,
      order: order++,
    });
    fields.push({
      id: uuidv4(),
      type: "checkbox",
      label: "Dietary Restrictions",
      required: false,
      options: ["Vegetarian", "Vegan", "Gluten-Free", "None"],
      order: order++,
    });
  } else if (formType === "Job Application") {
    fields.push({
      id: uuidv4(),
      type: "file_upload",
      label: "Upload Resume (PDF)",
      required: true,
      order: order++,
    });
    fields.push({
      id: uuidv4(),
      type: "long_text",
      label: "Why are you a good fit for this role?",
      required: true,
      order: order++,
    });
  } else if (formType === "Service Booking") {
    fields.push({
      id: uuidv4(),
      type: "date",
      label: "Preferred Date",
      required: true,
      order: order++,
    });
    fields.push({
      id: uuidv4(),
      type: "select",
      label: "Preferred Time",
      required: true,
      options: ["Morning (9AM-12PM)", "Afternoon (12PM-4PM)", "Evening (4PM-7PM)"],
      order: order++,
    });
  }

  return fields;
}

async function run() {
  console.log("Generating Premium Templates...");
  
  // Clear existing templates to start fresh
  await db.delete(templatesTable);

  const templatesToInsert = [];
  const templateFieldsToInsert = [];
  
  for (const industry of INDUSTRIES) {
    for (const formType of FORM_TYPES) {
      
      const title = `${industry.name} - ${formType}`;
      const description = `A premium, highly converting ${formType.toLowerCase()} template specifically designed for the ${industry.name} industry.`;
      
      // Determine pricing strategy (20% free, rest are paid premium)
      const isFree = Math.random() > 0.8;
      const price = isFree ? 0 : [499, 999, 1499, 1999][Math.floor(Math.random() * 4)];

      const templateId = uuidv4();

      templatesToInsert.push({
        id: templateId,
        title: title,
        description: description,
        industry: industry.name,
        price: price,
        isCurated: true,
        downloadsCount: Math.floor(Math.random() * 500),
        theme: industry.style,
        customThemeConfig: null,
      });

      const fields = generateFields(industry.name, formType);
      for (const f of fields) {
        templateFieldsToInsert.push({
          id: uuidv4(),
          templateId: templateId,
          type: f.type,
          label: f.label,
          required: f.required,
          order: f.order,
          options: f.options || null,
        });
      }
    }
  }

  // Double the list by adding a conversational variant for each
  const totalBase = templatesToInsert.length;
  for (let i = 0; i < totalBase; i++) {
    const base = templatesToInsert[i];
    const newTemplateId = uuidv4();
    templatesToInsert.push({
      ...base,
      id: newTemplateId,
      title: `${base.title} (Conversational)`,
      layoutType: "conversational"
    });

    // Copy fields for the conversational variant
    const baseFields = templateFieldsToInsert.filter(f => f.templateId === base.id);
    for (const f of baseFields) {
      templateFieldsToInsert.push({
        ...f,
        id: uuidv4(),
        templateId: newTemplateId,
      });
    }
  }

  console.log(`Inserting ${templatesToInsert.length} premium templates...`);
  for (let i = 0; i < templatesToInsert.length; i += 50) {
    await db.insert(templatesTable).values(templatesToInsert.slice(i, i + 50));
  }

  console.log(`Inserting ${templateFieldsToInsert.length} template fields...`);
  for (let i = 0; i < templateFieldsToInsert.length; i += 50) {
    await db.insert(templateFieldsTable).values(templateFieldsToInsert.slice(i, i + 50));
  }

  console.log("✅ Seeded Premium Template Marketplace successfully!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Failed to generate templates:", e);
  process.exit(1);
});
