

// @desc    Enroll in a course
// @route   POST /api/courses/enroll

import User from "../User.model.js";

// @access  Private
export const enrollCourse = async (req, res) => {
  try {
    const { courseId, courseName, courseIcon } = req.body;

    if (!courseId || !courseName) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and name are required',
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already enrolled
    const alreadyEnrolled = user.enrolledCourses.some(
      (course) => course.courseId === courseId
    );

    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course',
      });
    }

    // Add course to enrolled list
    user.enrolledCourses.push({
      courseId,
      courseName,
      courseIcon: courseIcon || '📚',
      enrolledAt: new Date(),
      progress: 0,
      completedConcepts: [],
      lastAccessed: new Date(),
      status: 'not_started',
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in course',
      enrolledCourses: user.enrolledCourses,
    });
  } catch (error) {
    console.error('Enroll Course Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all enrolled courses
// @route   GET /api/courses/enrolled
// @access  Private
export const getEnrolledCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      enrolledCourses: user.enrolledCourses,
      totalEnrolled: user.enrolledCourses.length,
    });
  } catch (error) {
    console.error('Get Enrolled Courses Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update course progress
// @route   PUT /api/courses/:courseId/progress
// @access  Private
export const updateCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { conceptId, completed } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Find enrolled course
    const courseIndex = user.enrolledCourses.findIndex(
      (course) => course.courseId === courseId
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in enrolled courses',
      });
    }

    const course = user.enrolledCourses[courseIndex];

    // Update completed concepts
    if (completed && !course.completedConcepts.includes(conceptId)) {
      course.completedConcepts.push(conceptId);
      
      // Award points
      user.points += 50;

      // Update status
      if (course.status === 'not_started') {
        course.status = 'in_progress';
      }
    } else if (!completed) {
      course.completedConcepts = course.completedConcepts.filter(
        (id) => id !== conceptId
      );
    }

    // Update last accessed
    course.lastAccessed = new Date();

    // Calculate progress percentage
    // Assuming each course has a fixed number of concepts
    // You can adjust this based on your course structure
    const totalConcepts = 12; // Example: 12 concepts per course
    course.progress = Math.round(
      (course.completedConcepts.length / totalConcepts) * 100
    );

    // Check if course is completed
    if (course.progress === 100) {
      course.status = 'completed';
    }

    // Also update the old progress format for backward compatibility
    const conceptKey = `${courseId}_${conceptId}`;
    if (completed) {
      user.progress.set(conceptKey, true);
    } else {
      user.progress.delete(conceptKey);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      course: course,
      points: user.points,
    });
  } catch (error) {
    console.error('Update Course Progress Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single course progress
// @route   GET /api/courses/:courseId
// @access  Private
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const course = user.enrolledCourses.find(
      (c) => c.courseId === courseId
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in enrolled courses',
        enrolled: false,
      });
    }

    res.status(200).json({
      success: true,
      enrolled: true,
      course: course,
    });
  } catch (error) {
    console.error('Get Course Progress Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Unenroll from course
// @route   DELETE /api/courses/:courseId/unenroll
// @access  Private
export const unenrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove course from enrolled list
    user.enrolledCourses = user.enrolledCourses.filter(
      (course) => course.courseId !== courseId
    );

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unenrolled from course',
      enrolledCourses: user.enrolledCourses,
    });
  } catch (error) {
    console.error('Unenroll Course Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get course statistics
// @route   GET /api/courses/stats
// @access  Private
export const getCourseStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const stats = {
      totalEnrolled: user.enrolledCourses.length,
      inProgress: user.enrolledCourses.filter(
        (c) => c.status === 'in_progress'
      ).length,
      completed: user.enrolledCourses.filter(
        (c) => c.status === 'completed'
      ).length,
      totalConcepts: user.enrolledCourses.reduce(
        (acc, course) => acc + course.completedConcepts.length,
        0
      ),
      averageProgress:
        user.enrolledCourses.length > 0
          ? Math.round(
              user.enrolledCourses.reduce(
                (acc, course) => acc + course.progress,
                0
              ) / user.enrolledCourses.length
            )
          : 0,
      points: user.points,
      streak: user.streak,
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get Course Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};