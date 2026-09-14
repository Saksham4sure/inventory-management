import { User } from '../models/user.model.js';
import { Business } from '../models/business.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateAuthToken, sanitizeUser } from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
  });

  const token = generateAuthToken(user);
  const safeUser = sanitizeUser(user);

  res.status(201).json(
    new ApiResponse(
      201,
      { user: safeUser, token, hasBusiness: false },
      'User registered successfully. Please proceed to business setup.'
    )
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateAuthToken(user);
  const safeUser = sanitizeUser(user);

  let business = null;
  if (user.businessId) {
    business = await Business.findById(user.businessId);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: safeUser,
        token,
        hasBusiness: Boolean(user.businessId),
        business,
      },
      'Logged in successfully'
    )
  );
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  let business = null;

  if (user.businessId) {
    business = await Business.findById(user.businessId);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        hasBusiness: Boolean(user.businessId),
        business,
      },
      'User profile fetched successfully'
    )
  );
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    throw new ApiError(400, 'Name is required');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name: name.trim() },
    { new: true }
  );

  res.status(200).json(new ApiResponse(200, { user: sanitizeUser(user) }, 'Profile updated successfully'));
});
