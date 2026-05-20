import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

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
  fields: [mongoose.Schema.Types.Mixed],
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

  await Promise.all([User.deleteMany(), Client.deleteMany(), Form.deleteMany(), Lead.deleteMany()]);

  // LAS has a single operator account — there is no public registration.
  const adminEmail = (process.env.ADMIN_EMAIL || "medialeotechagence@gmail.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "medialeo25";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const [admin] = await User.insertMany([
    { email: adminEmail, full_name: "Media Leo Tech", passwordHash, role: "admin" },
  ]);

  const [acme, globex] = await Client.insertMany([
    { name: "Acme Corp", industry: "Technology", website: "https://acme.example.com", createdBy: admin._id },
    { name: "Globex Industries", industry: "Manufacturing", website: "https://globex.example.com", createdBy: admin._id },
  ]);

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

  const statuses = ["new", "contacted", "qualified", "converted", "lost"];
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

  await Lead.insertMany(
    names.map(([email, fullName], i) => ({
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
    }))
  );

  console.log("Seed complete:");
  console.log(`  1 user   — ${adminEmail}`);
  console.log("  2 clients — Acme Corp, Globex Industries");
  console.log("  3 forms");
  console.log("  10 leads");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
