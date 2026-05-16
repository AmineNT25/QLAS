import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../las-backend/.env") });

// ─── Inline model definitions (avoids relative import issues) ─────────────────

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  full_name: String,
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "agent"], default: "agent" },
  createdAt: { type: Date, default: Date.now },
});

const clientSchema = new mongoose.Schema({
  name: String,
  industry: String,
  website: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

const formSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
  name: String,
  fields: [{ label: String, type: String, placeholder: String, required: Boolean, options: [String] }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
  email: { type: String, required: true },
  fullName: String,
  phone: String,
  score: { type: Number, default: 0 },
  status: { type: String, enum: ["new", "contacted", "qualified", "converted", "lost"], default: "new" },
  source: String,
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Client = mongoose.model("Client", clientSchema);
const Form = mongoose.model("Form", formSchema);
const Lead = mongoose.model("Lead", leadSchema);

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clear existing data
  await Promise.all([User.deleteMany(), Client.deleteMany(), Form.deleteMany(), Lead.deleteMany()]);

  // ─── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 10);
  const [admin] = await User.insertMany([
    { email: "admin@qlas.io", full_name: "Admin User", passwordHash, role: "admin" },
    { email: "agent@qlas.io", full_name: "Agent User", passwordHash, role: "agent" },
  ]);

  // ─── Clients ─────────────────────────────────────────────────────────────
  const [acme, globex] = await Client.insertMany([
    { name: "Acme Corp", industry: "Technology", website: "https://acme.example.com", createdBy: admin._id },
    { name: "Globex Industries", industry: "Manufacturing", website: "https://globex.example.com", createdBy: admin._id },
  ]);

  // ─── Forms ────────────────────────────────────────────────────────────────
  const [form1, form2, form3] = await Form.insertMany([
    {
      clientId: acme._id,
      name: "Acme Contact Form",
      fields: [
        { label: "Full Name", type: "text", placeholder: "Your name", required: true },
        { label: "Email", type: "email", placeholder: "your@email.com", required: true },
        { label: "Phone", type: "phone", placeholder: "+1 234 567 8900", required: false },
      ],
      isActive: true,
    },
    {
      clientId: acme._id,
      name: "Acme Demo Request",
      fields: [
        { label: "Email", type: "email", placeholder: "your@email.com", required: true },
        { label: "Company Size", type: "select", required: false, options: ["1-10", "11-50", "51-200", "200+"] },
      ],
      isActive: true,
    },
    {
      clientId: globex._id,
      name: "Globex Inquiry",
      fields: [
        { label: "Full Name", type: "text", placeholder: "Your name", required: true },
        { label: "Email", type: "email", placeholder: "your@email.com", required: true },
        { label: "Message", type: "textarea", placeholder: "How can we help?", required: false },
      ],
      isActive: true,
    },
  ]);

  // ─── Leads ────────────────────────────────────────────────────────────────
  const statuses = ["new", "contacted", "qualified", "converted", "lost"];
  const leads = [];
  const names = [
    ["alice@example.com", "Alice Johnson"],
    ["bob@example.com", "Bob Smith"],
    ["carol@example.com", "Carol White"],
    ["dave@example.com", "Dave Brown"],
    ["eve@example.com", "Eve Davis"],
    ["frank@example.com", "Frank Miller"],
    ["grace@example.com", "Grace Wilson"],
    ["henry@example.com", "Henry Moore"],
    ["iris@example.com", "Iris Taylor"],
    ["jack@example.com", "Jack Anderson"],
  ];

  names.forEach(([email, fullName], i) => {
    leads.push({
      clientId: i < 6 ? acme._id : globex._id,
      formId: i < 3 ? form1._id : i < 6 ? form2._id : form3._id,
      email,
      fullName,
      phone: `+1 555 000 ${String(i).padStart(4, "0")}`,
      score: Math.round(i * 11),
      status: statuses[i % 5],
      utmSource: i % 2 === 0 ? "google" : "facebook",
      utmMedium: "cpc",
      utmCampaign: "spring-2025",
    });
  });

  await Lead.insertMany(leads);

  console.log("Seed complete:");
  console.log("  2 users (admin@qlas.io / agent@qlas.io, password: password123)");
  console.log("  2 clients (Acme Corp, Globex Industries)");
  console.log("  3 forms");
  console.log("  10 leads");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
