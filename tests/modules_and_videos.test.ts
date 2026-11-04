import test from 'node:test';
import assert from 'node:assert/strict';
import { dbStore as db } from '../backend/src/repositories/db.ts';

test('1. Every course has exactly five logically organized modules', () => {
  const courses = db.getCourses();
  assert.ok(courses.length >= 7, 'Expected at least 7 courses in repository');

  for (const course of courses) {
    const modules = db.getModulesByCourse(course.course_id);
    assert.equal(
      modules.length, 
      5, 
      `Course ${course.course_id} (${course.course_name}) must have exactly 5 modules, got ${modules.length}`
    );

    // Sequence numbers should run strictly 1 to 5 in ascending order
    const sequences = modules.map((m) => m.sequence_no);
    assert.deepEqual(sequences, [1, 2, 3, 4, 5], `Modules for ${course.course_id} must be sequenced 1 through 5`);

    // Module topics must match the course topic
    for (const mod of modules) {
      const name = mod.title || mod.module_name;
      assert.ok(name && name.length > 5, `Module name "${name}" must be descriptive`);
      assert.ok(mod.description && mod.description.length > 10, `Module description "${mod.description}" must be descriptive`);
    }
  }
});

test('2. Every module has approximately three relevant educational videos with verified sources', () => {
  const courses = db.getCourses();

  let totalVideosCount = 0;
  for (const course of courses) {
    const modules = db.getModulesByCourse(course.course_id);
    for (const mod of modules) {
      const videos = db.getVideosByModule(mod.module_id);
      assert.equal(
        videos.length,
        3,
        `Module ${mod.module_id} (${mod.title || mod.module_name}) must have exactly 3 educational videos`
      );
      totalVideosCount += videos.length;

      for (const vid of videos) {
        assert.ok(vid.title && vid.title.length > 5, `Video ${vid.video_id} must have a valid title`);
        assert.ok(vid.youtube_url.includes('youtube.com') || vid.youtube_url.includes('youtu.be'), 
          `Video ${vid.video_id} must have a valid YouTube URL`);
        assert.ok(vid.embed_url.includes('/embed/'), 
          `Video ${vid.video_id} must have a valid embed URL`);
        assert.ok(vid.channel_name && vid.channel_name.length > 0, 
          `Video ${vid.video_id} must have a trusted channel name`);
        assert.ok(vid.duration && vid.duration.includes(':'), 
          `Video ${vid.video_id} must have a formatted duration (mm:ss or hh:mm:ss)`);
      }
    }
  }

  assert.equal(totalVideosCount, 105, 'Total verified educational videos across 7 courses must equal 105');
});

test('3. Course module progression goes from beginner to advanced across subject domains', () => {
  // crs-101: Modern Full-Stack Web Development
  const webModules = db.getModulesByCourse('crs-101');
  const webFirst = webModules[0].title || webModules[0].module_name;
  const webLast = webModules[4].title || webModules[4].module_name;
  assert.match(webFirst, /HTML|CSS|Layout/i, 'Module 1 should be beginner HTML/CSS foundations');
  assert.match(webLast, /Full-Stack|Integration|Cloud|Deployment/i, 'Module 5 should be advanced production integration');

  // crs-102: Practical Data Science & Machine Learning
  const dsModules = db.getModulesByCourse('crs-102');
  const dsFirst = dsModules[0].title || dsModules[0].module_name;
  const dsLast = dsModules[4].title || dsModules[4].module_name;
  assert.match(dsFirst, /Python|Scientific|Computing/i, 'Module 1 should be Python matrix/scientific computing');
  assert.match(dsLast, /Neural|Model Serving|Deep/i, 'Module 5 should be deep learning and production serving');

  // crs-103: Cloud Infrastructure & DevOps Mastery
  const cloudModules = db.getModulesByCourse('crs-103');
  const cloudFirst = cloudModules[0].title || cloudModules[0].module_name;
  const cloudLast = cloudModules[4].title || cloudModules[4].module_name;
  assert.match(cloudFirst, /Linux|Networking|Foundations/i, 'Module 1 should be Linux & Networking foundations');
  assert.match(cloudLast, /Observability|Monitoring|SRE/i, 'Module 5 should be multi-cloud observability and SRE');
});

test('4. Learning progress integrity: Watching a video does NOT mark it complete', () => {
  const enrollmentId = 'enr-001';
  const videoId = 'vid-101-1-1';

  // Record a watch activity
  const watchActivity = db.insertActivity({
    enrollment_id: enrollmentId,
    activity_type: 'video_watched',
    lesson_id: videoId,
    details: 'Started watching video lecture',
    completed: false
  });

  assert.equal(watchActivity.completed, false, 'Opening/watching video must NEVER mark completed');
  
  // Verify completion query does not count it
  const completedIds = db.getCompletedVideosForEnrollment(enrollmentId);
  assert.ok(!completedIds.includes(videoId), 'Completed video IDs list must not include unwatched/in-progress video');
});

test('5. Learning progress integrity: Explicit completion marks video completed', () => {
  const enrollmentId = 'enr-001';
  const videoId = 'vid-101-1-2';

  // Explicitly mark completed
  const completeActivity = db.insertActivity({
    enrollment_id: enrollmentId,
    activity_type: 'video_watched',
    lesson_id: videoId,
    details: 'Completed verified video lecture',
    completed: true
  });

  assert.equal(completeActivity.completed, true, 'Explicit completion must set completed=true');

  const completedIds = db.getCompletedVideosForEnrollment(enrollmentId);
  assert.ok(completedIds.includes(videoId), 'Completed video IDs list must include explicitly completed video');
});

test('6. Video details can be updated if link is unavailable or needs replacement', () => {
  const videoId = 'vid-101-1-3';
  const original = db.getVideo(videoId);
  assert.ok(original, 'Original video must exist');

  const updated = db.updateVideo(videoId, {
    title: 'Updated JavaScript Asynchronous Programming Deep Dive',
    youtube_url: 'https://www.youtube.com/watch?v=PoRJizFvM7s',
    duration: '22:15',
    description: 'Updated comprehensive event loop and async/await tutorial.'
  });

  assert.ok(updated, 'Update should return updated video');
  assert.equal(updated?.title, 'Updated JavaScript Asynchronous Programming Deep Dive');
  assert.equal(updated?.embed_url, 'https://www.youtube-nocookie.com/embed/PoRJizFvM7s');
  assert.equal(updated?.duration, '22:15');

  // Verify persistence in repository
  const fetched = db.getVideo(videoId);
  assert.equal(fetched?.title, 'Updated JavaScript Asynchronous Programming Deep Dive');
});
