const Post = require("./model");
const axios = require("axios");
const streamifier = require("streamifier");
const {
  saveImagesToMultipleSize,
  saveVideoToMultipleSize
} = require("./util-function");

//@TODO: Add API for change posts's votes

// @TODO: Find bugs
const createPost = (req, res, next) => {
  const { title, tags, url, nsfw, category, type, attributeLink } = req.body;
  let file = req.file;
  if (url) {
    const index = url.indexOf("?");
    let newUrl = url;
    if (index !== -1) {
      newUrl = url.slice(0, index);
      console.log(newUrl);
    }
    axios
      .get(newUrl, {
        responseType: "arraybuffer"
      })
      .then(response => {
        if (response.status === 200) {
          const buffered = new Buffer(response.data, "binary");
          if (type === "Photo") {
            return saveImagesToMultipleSize(buffered).then(data => {
              const post = new Post({
                _id: data._id,
                title: title,
                images: {
                  image460: {
                    height: data.height460,
                    width: data.width460,
                    url: `http://localhost:6969/images/${data._id}_460.jpg`
                  },
                  image700: {
                    height: data.height700,
                    width: data.width700,
                    url: `http://localhost:6969/images/${data._id}_700.jpg`
                  }
                },
                createdBy: req.userId,
                categoryId: category,
                tags: tags,
                type: "Photo",
                nsfw: nsfw
              });
              return post.save();
            });
          } else if (type === "Animated") {
            const videoStream = streamifier.createReadStream(buffered);
            return saveVideoToMultipleSize(videoStream)
              .then(data => console.log(data))
              .catch(err => console.log(err));
          }
        }
      })

      // .then(result => {
      //   res.status(200).json({
      //     message: "Hail Hydra",
      //     data: { _id: result._id, redirect: `/gag/${result._id}` }
      //   });
      // })
      .catch(err => {
        console.log(err);
        next(err);
      });
  } else if (file) {
    return saveImagesToMultipleSize(file.buffer)
      .then(data => {
        const post = new Post({
          _id: data._id,
          title: title,
          images: {
            image460: {
              height: data.height460,
              width: data.width460,
              url: `http://localhost:6969/images/${data._id}_460.jpg`
            },
            image700: {
              height: data.height700,
              width: data.width700,
              url: `http://localhost:6969/images/${data._id}_700.jpg`
            }
          },
          createdBy: req.userId,
          categoryId: category,
          tags: tags,
          type: "Photo",
          nsfw: nsfw
        });
        return post.save();
      })
      .then(result => {
        res.status(200).json({
          message: "Hail Hydra",
          data: { _id: result._id, redirect: `/gag/${result._id}` }
        });
      })
      .catch(err => {
        console.log(err);
        next(err);
      });
  }
};

// @TODO: Return image460* only
const getPosts = (req, res, next) => {
  const page = req.query.page || 1;
  return Post.find({
    active: true
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * 20)
    .limit(20)
    .populate("createdBy", "username avatarURL")
    .exec()
    .then(data => {
      res.status(200).json({
        message: "fetch_posts_successfully",
        post: data
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

// @TODO: Populate subcomment
const getPost = (req, res, next) => {
  const postId = req.params.postId;
  return Post.findOne({
    active: true,
    _id: postId
  })
    .populate("comments.createdBy", "username avatarURL")
    .populate("createdBy", "username avatarURL")
    .exec()
    .then(post => {
      if (!post) {
        const error = new Error("post_not_found");
        error.statusCode = 400;
        throw error;
      }
      res.status(200).json({
        message: "fetch_post_successfully",
        post: post
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

// @TODO: NEED VERY BIG REWORK!
const updatePost = (req, res, next) => {};

const deletePost = (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.userId;

  return Post.updateOne(
    {
      _id: postId,
      createdBy: userId,
      active: true
    },
    { active: false }
  )
    .then(result => {
      if (!result.nModified) {
        const error = new Error("post_not_found");
        error.statusCode = 400;
        throw error;
      }
      res.status(200).json({
        message: "post_deleted_successfully",
        postId: postId
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

// @TODO: Process Image
const addComment = (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.userId;
  const content = req.body.content;
  const imageURL = req.body.imageURL;
  console.log(imageURL);

  return Post.updateOne(
    {
      _id: postId,
      active: true
    },
    {
      $push: {
        comments: { createdBy: userId, content: content, imageURL: imageURL }
      }
    }
  )
    .then(result => {
      if (!result.nModified) {
        const error = new Error("post_not_found");
        error.statusCode = 400;
        throw error;
      }
      res.status(200).json({
        message: "add_comment_successfully"
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

const getPostComments = (req, res, next) => {
  const postId = req.params.postId;

  return Post.findOne({
    _id: postId,
    active: true
  })
    .then(data => {
      if (!data) {
        const error = new Error("post_not_found");
        error.statusCode = 400;
        throw error;
      }

      res.status(200).json({
        message: "fetch_post_comments_successfully",
        comments: data.comments
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

const getComment = (req, res, next) => {
  const postId = req.params.postId;
  const commentId = req.params.commentId;

  return Post.findOne({
    _id: postId,
    active: true
  })
    .then(data => {
      if (!data) {
        const error = new Error("post_not_found");
        error.statusCode = 400;
        throw error;
      }
      const comment = data.comments.find(comment => {
        return comment._id.toString() === commentId.toString();
      });
      if (!comment) {
        const error = new Error("comment_not_found");
        error.statusCode = 400;
        throw error;
      }
      res.status(200).json({
        message: "fetch_comment_successfully",
        comment: comment
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

const deleteComment = (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.userId;
  const commentId = req.params.commentId;

  return Post.findById(postId)
    .then(data => {
      if (!data) {
        const error = new Error("post_not_found");
        error.statusCode = 404;
        throw error;
      }
      const comment = data.comments.find(comment => {
        return comment._id.toString() === commentId.toString();
      });
      if (!comment) {
        const error = new Error("comment_not_found");
        error.statusCode = 404;
        throw error;
      }
      if (
        comment.createdBy.toString() !== userId.toString() &&
        post.createdBy.toString() !== userId.toString()
      ) {
        const error = new Error("action_not_authorized");
        error.statusCode = 401;
        throw error;
      }
      post.comments = post.comments.filter(
        each => each._id.toString() !== comment._id.toString()
      );
      return post.save();
    })
    .then(post => {
      res.status(200).json({
        message: "delete_comment_successfully",
        commentId: commentId
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

const updateComment = (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.userId;
  const commentId = req.params.commentId;
  const content = req.body.content;
  const imageURL = req.body.imageURL;

  return Post.findOne({
    _id: postId,
    active: true
  })
    .then(data => {
      if (!data) {
        const error = new Error("post_not_found");
        error.statusCode = 404;
        throw error;
      }
      const comment = data.comments.find(comment => {
        return comment._id.toString() === commentId.toString();
      });
      if (!comment) {
        const error = new Error("comment_not_found");
        error.statusCode = 404;
        throw error;
      }
      if (
        comment.createdBy.toString() !== userId.toString() &&
        data.createdBy.toString() !== userId.toString()
      ) {
        const error = new Error("action_not_authorized");
        error.statusCode = 401;
        throw error;
      }

      comment.content = content ? content : comment.content;
      comment.imageURL = imageURL ? imageURL : comment.imageURL;
      return data.save();
    })
    .then(result => {
      res.status(200).json({
        message: "update_comment_successfully",
        commentId: commentId
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

const addSubcomment = (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.userId;
  const commentId = req.params.commentId;
  const content = req.body.content;
  const imageURL = req.body.imageURL;

  return Post.findOne({
    _id: postId,
    active: true
  })
    .then(data => {
      if (!data) {
        const error = new Error("post_not_found");
        error.statusCode = 404;
        throw error;
      }
      const comment = data.comments.find(comment => {
        return comment._id.toString() === commentId.toString();
      });
      if (!comment) {
        const error = new Error("comment_not_found");
        error.statusCode = 404;
        throw error;
      }
      const subcomment = {
        createdBy: userId,
        content: content,
        imageURL: imageURL
      };
      comment.subcomments.push(subcomment);
      return data.save();
    })
    .then(result => {
      res.status(200).json({
        message: "subcomment_created_successfully",
        post: result
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

const getSubcomment = (req, res, next) => {
  const postId = req.params.postId;
  const commentId = req.params.commentId;
  const subcommentId = req.params.subcommentId;

  return Post.findOne({
    _id: postId,
    active: true
  })
    .then(result => {
      console.log(result);
      if (!result) {
        const error = new Error("post_not_found");
        error.statusCode = 404;
        throw error;
      }
      const comment = result.comments.find(
        each => each._id.toString() === commentId
      );
      if (!comment) {
        const error = new Error("comment_not_found");
        error.statusCode = 404;
        throw error;
      }

      const subcomment = comment.subcomments.find(subcomment => {
        return subcomment._id.toString() === subcommentId.toString();
      });

      if (!subcomment) {
        const error = new Error("subcomment_not_found");
        error.statusCode = 404;
        throw error;
      }

      res.status(200).json({
        message: "fetch_subcomment_successfully",
        Subcomment: subcomment
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

const getCommentSubcomments = (req, res, next) => {
  const postId = req.params.postId;
  const commentId = req.params.commentId;

  return Post.findOne({
    _id: postId,
    active: true
  })
    .then(result => {
      console.log(result);
      if (!result) {
        const error = new Error("post_not_found");
        error.statusCode = 404;
        throw error;
      }
      const comment = result.comments.find(
        each => each._id.toString() === commentId
      );
      if (!comment) {
        const error = new Error("comment_not_found");
        error.statusCode = 404;
        throw error;
      }

      res.status(200).json({
        message: "fetch_subcomment_successfully",
        subcomments: comment.subcomments
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

const deleteSubcomment = (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.userId;
  const commentId = req.params.commentId;
  const subcommentId = req.params.subcommentId;

  return Post.findOne({
    _id: postId,
    active: true
  })
    .then(result => {
      console.log(result);
      if (!result) {
        const error = new Error("post_not_found");
        error.statusCode = 404;
        throw error;
      }
      const commentIndex = result.comments.findIndex(
        each => each._id.toString() === commentId
      );
      if (commentIndex === -1) {
        const error = new Error("comment_not_found");
        error.statusCode = 404;
        throw error;
      }
      const comment = result.comments[commentIndex];
      const newSubcomment = comment.subcomments.filter(subcomment => {
        return subcomment._id.toString() !== subcommentId.toString();
      });

      if (newSubcomment.length === comment.subcomments.length) {
        const error = new Error("subcomment_not_found");
        error.statusCode = 404;
        throw error;
      }

      if (
        newSubcomment.createdBy.toString() !== userId.toString() &&
        result.createdBy.toString() !== userId.toString()
      ) {
        const error = new Error("action_not_authorized");
        error.statusCode = 400;
        throw error;
      }

      result.comments[commentIndex].subcomments = newSubcomment;
      return result.save();
    })
    .then(result => {
      res.status(200).json({
        message: "delete_subcomment_successfully",
        commentId: commentId
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

const updateSubcomment = (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.userId;
  const commentId = req.params.commentId;
  const content = req.body.content;
  const imageURL = req.body.imageURL;
  const subcommentId = req.params.subcommentId;

  return Post.findOne({
    _id: postId,
    active: true
  })
    .then(result => {
      console.log(result);
      if (!result) {
        const error = new Error("post_not_found");
        error.statusCode = 404;
        throw error;
      }
      const comment = result.comments.find(
        each => each._id.toString() === commentId
      );
      if (!comment) {
        const error = new Error("comment_not_found");
        error.statusCode = 404;
        throw error;
      }

      const subcomment = comment.subcomments.find(subcomment => {
        return subcomment._id.toString() === subcommentId.toString();
      });

      if (!subcomment) {
        const error = new Error("subcomment_not_found");
        error.statusCode = 404;
        throw error;
      }

      if (
        newSubcomment.createdBy.toString() !== userId.toString() &&
        result.createdBy.toString() !== userId.toString()
      ) {
        const error = new Error("action_not_authorized");
        error.statusCode = 400;
        throw error;
      }

      subcomment.content = content ? content : subcomment.content;
      subcomment.imageURL = imageURL ? imageURL : subcomment.imageURL;

      return result.save();
    })
    .then(result => {
      res.status(200).json({
        message: "update_subcomment_successfully",
        commentId: commentId
      });
    })
    .catch(err => {
      console.log(err);
      next(err);
    });
};

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  addComment,
  getPostComments,
  getComment,
  deleteComment,
  updateComment,
  addSubcomment,
  getSubcomment,
  getCommentSubcomments,
  deleteSubcomment,
  updateSubcomment
};
