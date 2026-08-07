import User from '../models/User.js';

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('name email profilePicture createdAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}
