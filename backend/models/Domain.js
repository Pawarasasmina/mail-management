import mongoose from 'mongoose';

const domainSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

// Ensure only one domain document exists
domainSchema.pre('save', async function(next) {
  const count = await mongoose.model('Domain').countDocuments();
  if (count > 0 && !this.isNew) {
    // Allow updates to existing
  } else if (count > 0 && this.isNew) {
    throw new Error('Only one domain document is allowed');
  }
  next();
});

export default mongoose.model('Domain', domainSchema);