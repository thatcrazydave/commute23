// import React, { useState, useRef } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { 
//   FaTimes, 
//   FaImage, 
//   FaVideo, 
//   FaLink, 
//   FaPoll,
//   FaSmile,
//   FaGlobeAmericas,
//   FaLock,
//   FaUserFriends,
//   FaCaretDown
// } from 'react-icons/fa';
// import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
// import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
// import { db, storage } from '../firebase';
// import './CreatePostModal.css';

// const CreatePostModal = ({ onClose, onPostCreated, currentUser, userProfile }) => {
//   const [content, setContent] = useState('');
//   const [selectedImage, setSelectedImage] = useState(null);
//   const [imagePreview, setImagePreview] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [privacy, setPrivacy] = useState('public');
//   const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
  
//   const fileInputRef = useRef(null);

//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
    
//     if (file.size > 5 * 1024 * 1024) {
//       alert('File size should not exceed 5MB');
//       return;
//     }
    
//     setSelectedImage(file);
    
//     const reader = new FileReader();
//     reader.onload = () => {
//       setImagePreview(reader.result);
//     };
//     reader.readAsDataURL(file);
//   };

//   const handleRemoveImage = () => {
//     setSelectedImage(null);
//     setImagePreview(null);
//     if (fileInputRef.current) {
//       fileInputRef.current.value = '';
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!content.trim() && !selectedImage) {
//       alert('Please add some content to your post');
//       return;
//     }
    
//     setIsLoading(true);
    
//     try {
//       let imageURL = null;
      
//       // Upload image if selected
//       if (selectedImage) {
//         const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${selectedImage.name}`);
//         const uploadTask = uploadBytesResumable(storageRef, selectedImage);
        
//         // Monitor upload progress
//         await new Promise((resolve, reject) => {
//           uploadTask.on(
//             'state_changed',
//             (snapshot) => {
//               const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//               setUploadProgress(progress);
//             },
//             (error) => {
//               console.error('Upload error:', error);
//               reject(error);
//             },
//             async () => {
//               imageURL = await getDownloadURL(uploadTask.snapshot.ref);
//               resolve();
//             }
//           );
//         });
//       }
      
//       // Create post document
//       const postRef = doc(collection(db, 'posts'));
//       const newPost = {
//         id: postRef.id,
//         authorId: currentUser.uid,
//         content: content.trim(),
//         imageURL,
//         privacy,
//         likesCount: 0,
//         commentsCount: 0,
//         createdAt: Timestamp.now(),
//         updatedAt: Timestamp.now()
//       };
      
//       await setDoc(postRef, newPost);
      
//       // Add author data for immediate display
//       const postWithAuthor = {
//         ...newPost,
//         author: {
//           id: currentUser.uid,
//           firstName: userProfile.firstName,
//           lastName: userProfile.lastName,
//           photoURL: userProfile.photoURL,
//           headline: userProfile.headline
//         },
//         isLiked: false,
//         isSaved: false
//       };
      
//       onPostCreated(postWithAuthor);
//     } catch (error) {
//       console.error('Error creating post:', error);
//       alert('Failed to create post. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const backdropVariants = {
//     hidden: { opacity: 0 },
//     visible: { opacity: 1 }
//   };

//   const modalVariants = {
//     hidden: { opacity: 0, y: 50, scale: 0.95 },
//     visible: { 
//       opacity: 1, 
//       y: 0, 
//       scale: 1,
//       transition: { type: 'spring', damping: 25, stiffness: 300 }
//     },
//     exit: { 
//       opacity: 0, 
//       y: 50, 
//       scale: 0.95,
//       transition: { duration: 0.2 }
//     }
//   };

//   const getPrivacyIcon = () => {
//     switch (privacy) {
//       case 'public':
//         return <FaGlobeAmericas />;
//       case 'friends':
//         return <FaUserFriends />;
//       case 'private':
//         return <FaLock />;
//       default:
//         return <FaGlobeAmericas />;
//     }
//   };

//   const getPrivacyLabel = () => {
//     switch (privacy) {
//       case 'public':
//         return 'Public';
//       case 'friends':
//         return 'Connections Only';
//       case 'private':
//         return 'Only Me';
//       default:
//         return 'Public';
//     }
//   };

//   return (
//     <AnimatePresence>
//       <motion.div 
//         className="modal-backdrop"
//         variants={backdropVariants}
//         initial="hidden"
//         animate="visible"
//         exit="hidden"
//         onClick={onClose}
//       >
//         <motion.div 
//           className="create-post-modal"
//           variants={modalVariants}
//           initial="hidden"
//           animate="visible"
//           exit="exit"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <div className="modal-header">
//             <h2>Create Post</h2>
//             <motion.button 
//               className="close-button"
//               onClick={onClose}
//               whileHover={{ scale: 1.1 }}
//               whileTap={{ scale: 0.9 }}
//             >
//               <FaTimes />
//             </motion.button>
//           </div>
          
//           <div className="modal-author">
//             <img 
//               src={userProfile?.photoURL || '/images/default-avatar.png'} 
//               alt={userProfile?.firstName} 
//               className="author-avatar"
//             />
//             <div className="author-info">
//               <h3>{userProfile?.firstName} {userProfile?.lastName}</h3>
//               <div className="privacy-selector">
//                 <button 
//                   className="privacy-button"
//                   onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
//                 >
//                   {getPrivacyIcon()}
//                   <span>{getPrivacyLabel()}</span>
//                   <FaCaretDown />
//                 </button>
                
//                 {showPrivacyMenu && (
//                   <div className="privacy-menu">
//                     <button 
//                       className={`privacy-option ${privacy === 'public' ? 'active' : ''}`}
//                       onClick={() => {
//                         setPrivacy('public');
//                         setShowPrivacyMenu(false);
//                       }}
//                     >
//                       <FaGlobeAmericas />
//                       <div className="option-text">
//                         <span>Public</span>
//                         <small>Anyone can see this post</small>
//                       </div>
//                     </button>
                    
//                     <button 
//                       className={`privacy-option ${privacy === 'friends' ? 'active' : ''}`}
//                       onClick={() => {
//                         setPrivacy('friends');
//                         setShowPrivacyMenu(false);
//                       }}
//                     >
//                       <FaUserFriends />
//                       <div className="option-text">
//                         <span>Connections Only</span>
//                         <small>Only your connections can see this post</small>
//                       </div>
//                     </button>
                    
//                     <button 
//                       className={`privacy-option ${privacy === 'private' ? 'active' : ''}`}
//                       onClick={() => {
//                         setPrivacy('private');
//                         setShowPrivacyMenu(false);
//                       }}
//                     >
//                       <FaLock />
//                       <div className="option-text">
//                         <span>Only Me</span>
//                         <small>Only you can see this post</small>
//                       </div>
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
          
//           <form onSubmit={handleSubmit}>
//             <div className="post-content-input">
//               <textarea
//                 placeholder={`What's on your mind, ${userProfile?.firstName}?`}
//                 value={content}
//                 onChange={(e) => setContent(e.target.value)}
//                 disabled={isLoading}
//               />
              
//               {imagePreview && (
//                 <div className="image-preview-container">
//                   <img src={imagePreview} alt="Preview" className="image-preview" />
//                   <motion.button 
//                     type="button"
//                     className="remove-image-button"
//                     onClick={handleRemoveImage}
//                     whileHover={{ scale: 1.1 }}
//                     whileTap={{ scale: 0.9 }}
//                   >
//                     <FaTimes />
//                   </motion.button>
//                 </div>
//               )}
              
//               {isLoading && uploadProgress > 0 && uploadProgress < 100 && (
//                 <div className="upload-progress">
//                   <div className="progress-bar">
//                     <div 
//                       className="progress-fill"
//                       style={{ width: `${uploadProgress}%` }}
//                     ></div>
//                   </div>
//                   <span>{Math.round(uploadProgress)}%</span>
//                 </div>
//               )}
//             </div>
            
//             <div className="post-options">
//               <h4>Add to your post</h4>
//               <div className="options-buttons">
//                 <motion.button 
//                   type="button"
//                   className="option-button"
//                   onClick={() => fileInputRef.current.click()}
//                   whileHover={{ scale: 1.1 }}
//                   whileTap={{ scale: 0.9 }}
//                 >
//                   <FaImage className="image-icon" />
//                 </motion.button>
                
//                 <motion.button 
//                   type="button"
//                   className="option-button"
//                   whileHover={{ scale: 1.1 }}
//                   whileTap={{ scale: 0.9 }}
//                 >
//                   <FaVideo className="video-icon" />
//                 </motion.button>
                
//                 <motion.button 
//                   type="button"
//                   className="option-button"
//                   whileHover={{ scale: 1.1 }}
//                   whileTap={{ scale: 0.9 }}
//                 >
//                   <FaLink className="link-icon" />
//                 </motion.button>
                
//                 <motion.button 
//                   type="button"
//                   className="option-button"
//                   whileHover={{ scale: 1.1 }}
//                   whileTap={{ scale: 0.9 }}
//                 >
//                   <FaPoll className="poll-icon" />
//                 </motion.button>
                
//                 <motion.button 
//                   type="button"
//                   className="option-button"
//                   whileHover={{ scale: 1.1 }}
//                   whileTap={{ scale: 0.9 }}
//                 >
//                   <FaSmile className="emoji-icon" />
//                 </motion.button>
//               </div>
              
//               <input
//                 type="file"
//                 ref={fileInputRef}
//                 onChange={handleImageChange}
//                 accept="image/*"
//                 style={{ display: 'none' }}
//               />
//             </div>
            
//             <motion.button 
//               type="submit"
//               className="post-button"
//               disabled={isLoading || (!content.trim() && !selectedImage)}
//               whileHover={{ scale: 1.03 }}
//               whileTap={{ scale: 0.97 }}
//             >
//               {isLoading ? 'Posting...' : 'Post'}
//             </motion.button>
//           </form>
//         </motion.div>
//       </motion.div>
//     </AnimatePresence>
//   );
// };

// export default CreatePostModal;